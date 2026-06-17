"""Upload router — legacy redirects to the unified /translate/ page."""

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

router = APIRouter(prefix="/upload", tags=["upload"])


@router.get("/")
async def upload_page_redirect(request: Request):
    """Redirect old /upload/ to unified /translate/ page."""
    session_id = request.query_params.get("session_id", "")
    url = f"/translate/?session_id={session_id}" if session_id else "/translate/"
    return RedirectResponse(url=url, status_code=301)


@router.post("/")
async def upload_post_redirect(request: Request):
    """Redirect old upload POST to /translate/upload."""
    return RedirectResponse(url="/translate/upload", status_code=308)


@router.get("/status/{session_id}")
async def upload_status_redirect(session_id: str):
    """Redirect old status endpoint to /translate/upload-status/."""
    return RedirectResponse(url=f"/translate/upload-status/{session_id}", status_code=301)
