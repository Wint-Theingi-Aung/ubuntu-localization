"""Guide router — interactive user guide and documentation."""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from backend.config import PROJECT_ROOT, LANGUAGES
from backend.templates_engine import templates

router = APIRouter(prefix="/guide", tags=["guide"])


@router.get("/", response_class=HTMLResponse)
async def guide_page(request: Request, chapter: int = 0):
    """Show the interactive user guide."""
    chapters = [
        {"id": 1, "title": "Getting Started", "icon": "🚀",
         "desc": "Installation, setup, and tool overview"},
        {"id": 2, "title": "Obtaining .po Files", "icon": "📥",
         "desc": "Download from Launchpad, Ubuntu archives, or your project"},
        {"id": 3, "title": "Uploading Files", "icon": "📤",
         "desc": "Import .po files and parse untranslated strings"},
        {"id": 4, "title": "Detecting Missing Strings", "icon": "🔍",
         "desc": "Scan for gaps and prioritize by importance"},
        {"id": 5, "title": "Translating with AI", "icon": "🤖",
         "desc": "Batch translation with Gemini and QA verification"},
        {"id": 6, "title": "Exporting & Publishing", "icon": "📦",
         "desc": "Save .po files, commit to git, push to GitHub"},
    ]

    return templates.TemplateResponse(request, "guide.html", {"chapters": chapters,
        "active_chapter": chapter,
        "languages": LANGUAGES})


@router.get("/quickref", response_class=HTMLResponse)
async def quick_reference(request: Request):
    """Show the quick reference card."""
    return templates.TemplateResponse(request, "quickref.html")
