"""Guide router — beginner-friendly user guide for the localization tool."""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from backend.templates_engine import templates

router = APIRouter(prefix="/guide", tags=["guide"])


@router.get("/", response_class=HTMLResponse)
async def guide_page(request: Request, chapter: int = 0):
    """Show the beginner-friendly user guide. chapter=0 shows all chapters."""

    chapters = [
        {
            "id": 1,
            "title": "What This Tool Does",
            "icon": "📖",
            "desc": "Overview of the AI-powered .po localization tool and supported languages",
        },
        {
            "id": 2,
            "title": "Uploading a .po File",
            "icon": "📤",
            "desc": "How to get and upload your translation files",
        },
        {
            "id": 3,
            "title": "How Translation Works",
            "icon": "🤖",
            "desc": "Google Gemini AI, batch processing, and quality checks",
        },
        {
            "id": 4,
            "title": "Editing Translations",
            "icon": "✏️",
            "desc": "Manual editing, auto-save, and reviewing AI suggestions",
        },
        {
            "id": 5,
            "title": "Exporting Your Work",
            "icon": "📦",
            "desc": "Download the translated .po file and commit to Git",
        },
        {
            "id": 6,
            "title": "Tips for Best Results",
            "icon": "💡",
            "desc": "Language-specific advice and common pitfalls to avoid",
        },
    ]

    return templates.TemplateResponse(
        request,
        "guide.html",
        {
            "chapters": chapters,
            "active_chapter": chapter,
        },
    )


@router.get("/quickref", response_class=HTMLResponse)
async def quick_reference(request: Request):
    """Show the quick reference card."""
    return templates.TemplateResponse(request, "quickref.html")
