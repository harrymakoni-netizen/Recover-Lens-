"""Vercel serverless entry point: the FastAPI backend, served at /api/*.

If the backend fails to start (missing file, bad DATABASE_URL, database unreachable), a tiny
fallback app answers every /api request with the error, so the cause shows up at /api/health
instead of an opaque FUNCTION_INVOCATION_FAILED.
"""

import os
import sys
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

try:
    from app.main import app  # noqa: E402,F401
except Exception as exc:  # noqa: BLE001
    traceback.print_exc()  # full trace goes to the Vercel function logs
    _error = {
        "status": "error",
        "error": f"{type(exc).__name__}: {exc}"[:500],
        "hint": "The RecoverLens API could not start. Check DATABASE_URL / POSTGRES_URL and the function logs.",
    }

    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def startup_failed(path: str) -> JSONResponse:
        return JSONResponse(_error, status_code=503)
