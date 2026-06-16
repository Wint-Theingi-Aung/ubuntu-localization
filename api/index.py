"""Vercel serverless entry point — re-exports the FastAPI app from backend."""

import sys
import traceback

try:
    from backend.main import app
except Exception:
    # If import fails, create a minimal app that shows the error
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse

    app = FastAPI()

    @app.get("/{path:path}")
    async def debug_error(path: str = ""):
        return PlainTextResponse(
            f"IMPORT ERROR:\n\n{traceback.format_exc()}\n\n"
            f"sys.path: {sys.path}\n\n"
            f"sys.prefix: {sys.prefix}",
            status_code=500,
        )
