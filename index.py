"""Vercel entry point — FastAPI app for Ubuntu Localization Tool."""

import sys
import traceback
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = str(Path(__file__).resolve().parent)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

def _build_app():
    try:
        from backend.main import app as _app
        return _app
    except Exception:
        tb = traceback.format_exc()
        _app = FastAPI()

        @_app.get("/{path:path}")
        async def catchall(path: str = ""):
            return HTMLResponse(
                f"<h2>Import Error</h2><pre>{tb}</pre>"
                f"<p><b>sys.path:</b> {sys.path}</p>"
                f"<p><b>Python:</b> {sys.version}</p>",
                status_code=500,
            )
        return _app

app = _build_app()
