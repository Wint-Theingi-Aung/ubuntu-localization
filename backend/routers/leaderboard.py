"""Leaderboard router — top contributors, per-language stats, contribution timelines."""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse

from backend.config import LANGUAGES
from backend.services import db
from backend.templates_engine import templates

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/", response_class=HTMLResponse)
async def leaderboard_page(request: Request, lang: str = ""):
    """Show the leaderboard page with top contributors."""
    leaderboard = db.get_leaderboard(language_code=lang, limit=50)
    stats = db.get_app_stats()
    lang_stats = db.get_language_stats()

    return templates.TemplateResponse(request, "leaderboard.html", {
        "leaderboard": leaderboard,
        "stats": stats,
        "lang_stats": lang_stats,
        "active_lang": lang,
        "languages": LANGUAGES,
    })


@router.get("/api", response_class=JSONResponse)
async def leaderboard_api(lang: str = "", limit: int = 50):
    """JSON API for the leaderboard."""
    return {
        "leaderboard": db.get_leaderboard(language_code=lang, limit=limit),
        "stats": db.get_app_stats(),
        "by_language": db.get_language_stats(),
    }


@router.get("/contributor/{username}", response_class=HTMLResponse)
async def contributor_detail(request: Request, username: str):
    """Show detailed stats for a single contributor."""
    contrib = db.get_contributor_stats(username)
    if not contrib or not contrib["total_strings"]:
        return templates.TemplateResponse(request, "leaderboard.html", {
            "leaderboard": db.get_leaderboard(),
            "stats": db.get_app_stats(),
            "lang_stats": db.get_language_stats(),
            "error": f"Contributor '{username}' not found.",
        })

    # Get contributor rank among all
    full_board = db.get_leaderboard(limit=200)
    rank = contrib["rank"]

    return templates.TemplateResponse(request, "contributor.html", {
        "contrib": contrib,
        "rank": rank,
        "rank_pct": f"Top {max(1, round(rank / max(1, len(full_board)) * 100))}%"
        if full_board else "Only contributor",
        "total_contributors": len(full_board),
        "languages": LANGUAGES,
    })


@router.get("/widget", response_class=HTMLResponse)
async def leaderboard_widget(request: Request, lang: str = "", limit: int = 5):
    """htmx widget showing top N contributors — embeddable on dashboard."""
    leaderboard = db.get_leaderboard(language_code=lang, limit=limit)
    return templates.TemplateResponse(request, "partials/leaderboard_widget.html", {
        "leaderboard": leaderboard,
        "lang": lang,
    })


@router.get("/stats-widget", response_class=HTMLResponse)
async def stats_widget(request: Request):
    """htmx widget showing overall stats — embeddable on dashboard."""
    stats = db.get_app_stats()
    return HTMLResponse(f"""<div class="stats-grid" id="stats-widget">
        <div class="stat">
            <span class="stat-value">{stats['total_strings_exported']:,}</span>
            <span class="stat-label">Strings Exported</span>
        </div>
        <div class="stat">
            <span class="stat-value">{stats['total_exports']:,}</span>
            <span class="stat-label">Exports</span>
        </div>
        <div class="stat">
            <span class="stat-value">{stats['contributors']}</span>
            <span class="stat-label">Contributors</span>
        </div>
        <div class="stat">
            <span class="stat-value">{stats['sessions']}</span>
            <span class="stat-label">Sessions</span>
        </div>
    </div>""")
