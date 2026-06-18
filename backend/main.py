"""Ubuntu Localization Tool — FastAPI Application Entry Point.

UV-powered FastAPI + Jinja2 + htmx UI for translating Ubuntu .po files
into indigenous languages using Google Gemini AI.

Usage:
    uv run uvicorn backend.main:app --reload
"""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import config, PROJECT_ROOT, EXPORTS_DIR, LANGUAGES, LANGUAGE_CHOICES
from backend.routers import upload, translate, export, guide, leaderboard
from backend.services.translator import check_available
from backend.services.session import list_recent_sessions
from backend.services import db
from backend.templates_engine import templates

# ── App Factory ────────────────────────────────────────────────────────

app = FastAPI(
    title="Ubuntu Localization Tool",
    description="AI-powered Ubuntu OS localization for indigenous languages",
    version="2.0.0",
    docs_url="/api/docs" if config.debug else None,
    redoc_url=None,
)

# ── Static Files ───────────────────────────────────────────────────────

static_dir = PROJECT_ROOT / "backend" / "static"
try:
    static_dir.mkdir(parents=True, exist_ok=True)
except OSError:
    pass  # read-only filesystem (Vercel)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Export downloads
exports_dir = EXPORTS_DIR
try:
    exports_dir.mkdir(parents=True, exist_ok=True)
except OSError:
    pass  # read-only filesystem — config.py already set it to /tmp
app.mount("/exports", StaticFiles(directory=str(exports_dir)), name="exports")


# ── Routers ────────────────────────────────────────────────────────────

app.include_router(upload.router)
app.include_router(translate.router)
app.include_router(export.router)
app.include_router(guide.router)
app.include_router(leaderboard.router)

# ── Main Pages ─────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Main dashboard — language overview and recent sessions."""
    sessions = list_recent_sessions(limit=5)
    return templates.TemplateResponse(request, "dashboard.html", {
        "sessions": sessions,
        "ai_available": check_available(),
    })


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "ai_available": check_available(),
        "version": "2.0.0",
        "languages": list(LANGUAGES.keys()),
    }


# ── Favicon ────────────────────────────────────────────────────────────

@app.get("/favicon.ico")
async def favicon():
    """Serve favicon."""
    favicon_path = static_dir / "favicon.ico"
    if favicon_path.exists():
        return FileResponse(str(favicon_path))
    return HTMLResponse("", status_code=404)


# ── Run ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8501,
        reload=config.debug,
    )
