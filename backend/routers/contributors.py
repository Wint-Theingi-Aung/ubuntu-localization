"""Contributors router — Launchpad-sourced contributor list, per-language filtering."""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse

from backend.config import LANGUAGES
from backend.services import db
from backend.services import launchpad_client
from backend.services.ui_translations import get_ui_lang, t
from backend.templates_engine import templates

router = APIRouter(prefix="/contributors", tags=["contributors"])


@router.get("/", response_class=HTMLResponse)
async def contributors_page(request: Request, lang: str = ""):
    """Show the contributors page with Launchpad-sourced data."""
    contributors = launchpad_client.get_contributors_with_details(limit=50)

    # Filter by language if requested
    if lang:
        contributors = [c for c in contributors if lang in c.get("languages", [])]

    # Merge local DB stats (strings_translated) when available
    db_board = db.get_leaderboard(limit=200)
    db_map = {}
    for entry in db_board:
        uname = entry.get("username", "")
        if uname:
            db_map[uname] = entry

    for c in contributors:
        db_entry = db_map.get(c["username"], {})
        c["strings_translated"] = db_entry.get("total_strings", 0) if db_entry else 0
        c["exports_count"] = db_entry.get("total_exports", 0) if db_entry else 0

    stats = db.get_app_stats()
    lang_stats = db.get_language_stats()

    return templates.TemplateResponse(request, "contributors_list.html", {
        "contributors": contributors,
        "stats": stats,
        "lang_stats": lang_stats,
        "active_lang": lang,
        "languages": LANGUAGES,
    })


@router.get("/api", response_class=JSONResponse)
async def contributors_api(lang: str = "", limit: int = 50):
    """JSON API for contributors."""
    contributors = launchpad_client.get_contributors_with_details(limit=limit)
    if lang:
        contributors = [c for c in contributors if lang in c.get("languages", [])]
    return {
        "contributors": contributors,
        "stats": db.get_app_stats(),
        "by_language": db.get_language_stats(),
    }


@router.get("/contributor/{username}", response_class=HTMLResponse)
async def contributor_detail(request: Request, username: str):
    """Show detailed info for a single contributor from Launchpad."""
    detail = launchpad_client.get_contributor_detail(username)
    if not detail:
        contributors = launchpad_client.get_contributors_with_details(limit=50)
        return templates.TemplateResponse(request, "contributors_list.html", {
            "contributors": contributors,
            "stats": db.get_app_stats(),
            "lang_stats": db.get_language_stats(),
            "error": f"Contributor '{username}' not found on Launchpad.",
            "languages": LANGUAGES,
            "active_lang": "",
        })

    # Merge local DB stats
    db_stats = db.get_contributor_stats(username)
    if db_stats:
        detail["strings_translated"] = db_stats.get("total_strings", 0)
        detail["exports_count"] = db_stats.get("total_exports", 0)
        detail["by_language"] = db_stats.get("by_language", [])
    else:
        detail["strings_translated"] = 0
        detail["exports_count"] = 0
        detail["by_language"] = []

    return templates.TemplateResponse(request, "contributor.html", {
        "contrib": detail,
        "languages": LANGUAGES,
    })


@router.get("/widget", response_class=HTMLResponse)
async def contributors_widget(request: Request, lang: str = "", limit: int = 5):
    """htmx widget showing top contributors — embeddable on dashboard."""
    contributors = launchpad_client.get_contributors_with_details(limit=20)
    if lang:
        contributors = [c for c in contributors if lang in c.get("languages", [])]
    contributors = contributors[:limit]

    # Merge local DB stats
    db_map = {e.get("username", ""): e for e in db.get_leaderboard(limit=200) if e.get("username")}
    for c in contributors:
        db_entry = db_map.get(c["username"], {})
        c["strings_translated"] = db_entry.get("total_strings", 0) if db_entry else 0

    return templates.TemplateResponse(request, "partials/contributors_widget.html", {
        "contributors": contributors,
        "lang": lang,
    })


@router.get("/stats-widget", response_class=HTMLResponse)
async def stats_widget(request: Request):
    """htmx widget showing overall stats — embeddable on dashboard."""
    stats = db.get_app_stats()
    lang = get_ui_lang(request)
    return HTMLResponse(f"""<div class="stats-grid" id="stats-widget">
        <div class="stat">
            <span class="stat-value">{stats['total_strings_exported']:,}</span>
            <span class="stat-label">{t('contributors.stats.strings_exported', lang)}</span>
        </div>
        <div class="stat">
            <span class="stat-value">{stats['total_exports']:,}</span>
            <span class="stat-label">{t('contributors.stats.exports', lang)}</span>
        </div>
        <div class="stat">
            <span class="stat-value">{stats['contributors']}</span>
            <span class="stat-label">{t('contributors.stats.contributors', lang)}</span>
        </div>
        <div class="stat">
            <span class="stat-value">{stats['sessions']}</span>
            <span class="stat-label">{t('contributors.stats.sessions', lang)}</span>
        </div>
    </div>""")
