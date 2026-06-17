"""Export router — history page + legacy redirects to unified /translate/ page.

The export functionality now lives on the /translate/ page directly.
This router keeps /export/history and download endpoints + redirects.
"""

import json
from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, RedirectResponse

from backend.config import EXPORTS_DIR
from backend.templates_engine import templates

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/")
async def export_page_redirect(request: Request):
    """Redirect old /export/ to unified /translate/ page."""
    session_id = request.query_params.get("session_id", "")
    url = f"/translate/?session_id={session_id}" if session_id else "/translate/"
    return RedirectResponse(url=url, status_code=301)


@router.post("/")
async def export_post_redirect(request: Request):
    """Redirect old export POST to /translate/export."""
    return RedirectResponse(url="/translate/export", status_code=308)


@router.get("/history", response_class=HTMLResponse)
async def export_history(request: Request):
    """Show export history."""
    manifests = []
    for mf in sorted(EXPORTS_DIR.glob("manifest_*.json"), reverse=True):
        try:
            manifests.append(json.loads(mf.read_text()))
        except Exception:
            pass

    return templates.TemplateResponse(request, "history.html", {"exports": manifests})


@router.get("/download/{filename}")
async def download_export(filename: str):
    """Download an exported .po file (legacy route — also available at /translate/download/)."""
    path = EXPORTS_DIR / filename
    if not path.exists():
        return JSONResponse({"error": "File not found"}, status_code=404)
    return FileResponse(
        path=str(path),
        filename=filename,
        media_type="text/x-gettext-translation",
    )
