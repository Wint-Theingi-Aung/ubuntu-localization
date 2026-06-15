"""Auth router — Launchpad login, profile, karma, teams."""

from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse

from backend.services.launchpad_client import (
    is_authenticated,
    get_auth_status,
    get_my_profile,
    get_profile,
    get_karma,
    get_teams,
    get_top_contributors,
)
from backend.templates_engine import templates

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/", response_class=HTMLResponse)
async def auth_page(request: Request):
    """Show the Launchpad auth/profile page."""
    auth_status = get_auth_status()

    if auth_status.get("authenticated"):
        profile = get_my_profile()
        return templates.TemplateResponse(request, "profile.html", {"authenticated": True,
            "profile": profile,
            "auth_status": auth_status})

    return templates.TemplateResponse(request, "login.html", {"authenticated": False,
        "auth_status": auth_status})


@router.get("/status", response_class=HTMLResponse)
async def auth_status_partial(request: Request):
    """Return auth status partial for htmx updates."""
    auth_status = get_auth_status()
    if auth_status.get("authenticated"):
        profile = get_my_profile()
        if profile:
            return HTMLResponse(f"""<div id="auth-widget" class="auth-widget authed">
                <img src="https://launchpad.net/@@/person" class="lp-avatar" alt="LP" width="24" height="24">
                <span class="auth-name">{profile['display_name']}</span>
                <span class="auth-karma">{profile['karma']:,} karma</span>
                <a href="/auth" class="auth-link">Profile</a>
            </div>""")
    return HTMLResponse("""<div id="auth-widget" class="auth-widget">
        <a href="/auth" class="btn btn-outline btn-sm">🔐 Login with Launchpad</a>
    </div>""")


@router.get("/profile/{username}", response_class=HTMLResponse)
async def public_profile(request: Request, username: str):
    """Show a public Launchpad profile."""
    profile = get_profile(username)
    if not profile:
        return templates.TemplateResponse(request, "profile.html", {"authenticated": is_authenticated(),
            "error": f"User '{username}' not found on Launchpad."})

    karma_data = get_karma(username)
    teams = get_teams(username)
    top_contribs = get_top_contributors(limit=10)

    # Find ranking
    rank = None
    for i, c in enumerate(top_contribs, 1):
        if c["username"] == username:
            rank = i
            break

    return templates.TemplateResponse(request, "profile.html", {"authenticated": is_authenticated(),
        "profile": profile,
        "karma": karma_data,
        "teams": teams,
        "rank": rank,
        "top_contributors": top_contribs,
        "is_public": True})
