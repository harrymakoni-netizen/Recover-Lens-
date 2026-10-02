"""RecoverLens API (SPEC §9). Run: uvicorn app.main:app --reload --port 8000"""

import os
from typing import Any, Optional

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .db import make_engine
from .routes import alerts, patients, screenings, sessions
from .seed import reset_and_seed, seed_if_empty


def create_app(database_url: Optional[str] = None, seed: bool = True) -> FastAPI:
    url = database_url or os.environ.get("DATABASE_URL", "sqlite:///recoverlens.db")
    engine = make_engine(url)
    if seed:
        seed_if_empty(engine)

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

    @api.post("/seed")
    def reseed(request: Request) -> dict[str, Any]:
        """Dev only: reset demo data. Disabled when ENABLE_SEED_ENDPOINT=false."""
        if os.environ.get("ENABLE_SEED_ENDPOINT", "true").lower() == "false":
            raise HTTPException(403, "Seeding is disabled")
        reset_and_seed(request.app.state.engine)
        return {"status": "seeded"}

    api.include_router(patients.router)
    api.include_router(sessions.router)
    api.include_router(alerts.router)
    api.include_router(screenings.router)
    app.include_router(api)
    return app


app = create_app()
