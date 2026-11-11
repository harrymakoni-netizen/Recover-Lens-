"""RecoverLens API (SPEC §9). Run: uvicorn app.main:app --reload --port 8000"""

import hmac
import os
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from .db import make_engine, resolve_database_url
from .models import DemoState
from .routes import alerts, coach, patients, screenings, sessions
from .seed import reset_and_seed, seed_if_empty


def create_app(database_url: Optional[str] = None, seed: bool = True) -> FastAPI:
    engine = make_engine(resolve_database_url(database_url))
    if seed:
        try:
            seed_if_empty(engine)
        except Exception:  # noqa: BLE001
            # Two serverless instances can cold-start at once; one seeds, the other carries on.
            pass

    app = FastAPI(title="RecoverLens API", version="2.0.0")
    app.state.engine = engine

    origins = [o.strip() for o in os.environ.get("FRONTEND_ORIGINS", "*").split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health() -> dict[str, Any]:
        return {"status": "ok"}

    def demo_state(request: Request) -> Optional[DemoState]:
        with Session(request.app.state.engine) as db:
            return db.get(DemoState, "demo")

    @api.get("/demo")
    def demo(request: Request) -> dict[str, Any]:
        """When the demo data was last created, and how (start, button or nightly)."""
        state = demo_state(request)
        return {"seeded_at": state.seeded_at if state else None, "source": state.source if state else None}

    @api.post("/seed")
    def reseed(request: Request) -> dict[str, Any]:
        """Reset demo data (the "Reset demo data" button). Disabled when ENABLE_SEED_ENDPOINT=false;
        when SEED_KEY is set, the request must carry it in an X-Seed-Key header. A reset within
        SEED_COOLDOWN_S seconds (default 30) of the last one is refused, so it cannot be hammered."""
        if os.environ.get("ENABLE_SEED_ENDPOINT", "true").lower() == "false":
            raise HTTPException(403, "Seeding is disabled")
        key = os.environ.get("SEED_KEY")
        if key and not hmac.compare_digest(request.headers.get("x-seed-key", ""), key):
            raise HTTPException(403, "A valid X-Seed-Key header is required")
        cooldown = float(os.environ.get("SEED_COOLDOWN_S", "30"))
        state = demo_state(request)
        if state and cooldown > 0:
            last = state.seeded_at if state.seeded_at.tzinfo else state.seeded_at.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - last).total_seconds() < cooldown:
                raise HTTPException(429, "The demo data was reset moments ago")
        reset_and_seed(request.app.state.engine, source="button")
        return {"status": "seeded"}

    @api.get("/cron/reseed")
    def nightly_reseed(request: Request) -> dict[str, Any]:
        """Nightly job (vercel.json "crons"): recreate the demo data with today's dates, so the demo
        patients never drift (Tendai stays 4 days lapsed) and changes made by visitors are undone.
        Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set; then it is required."""
        if os.environ.get("ENABLE_SEED_ENDPOINT", "true").lower() == "false":
            raise HTTPException(403, "Seeding is disabled")
        secret = os.environ.get("CRON_SECRET")
        if secret and not hmac.compare_digest(request.headers.get("authorization", ""), f"Bearer {secret}"):
            raise HTTPException(401, "Not the scheduled job")
        reset_and_seed(request.app.state.engine, source="nightly")
        return {"status": "seeded"}

    api.include_router(patients.router)
    api.include_router(sessions.router)
    api.include_router(alerts.router)
    api.include_router(screenings.router)
    api.include_router(coach.router)
    app.include_router(api)
    return app


app = create_app()
