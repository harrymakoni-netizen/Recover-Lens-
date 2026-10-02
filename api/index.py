"""Vercel serverless entry point: the FastAPI backend, served at /api/*.

If the backend fails to start (missing file, bad DATABASE_URL, database unreachable), a tiny
fallback app answers every /api request with the error, so the cause shows up at /api/health
instead of an opaque FUNCTION_INVOCATION_FAILED.
"""

import os
import sys
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def _load_app():
    try:
        from app.main import app as backend_app

        return backend_app
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()  # full trace goes to the Vercel function logs
        error = {
            "status": "error",
            "error": f"{type(exc).__name__}: {exc}"[:500],
            "hint": "The RecoverLens API could not start. Check DATABASE_URL / POSTGRES_URL and the function logs.",
        }

        from fastapi import FastAPI
        from fastapi.responses import JSONResponse

        fallback = FastAPI()

        @fallback.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
        def startup_failed(path: str) -> JSONResponse:
            return JSONResponse(error, status_code=503)

        return fallback


# Vercel's Python builder looks for a top-level `app`.
app = _load_app()
