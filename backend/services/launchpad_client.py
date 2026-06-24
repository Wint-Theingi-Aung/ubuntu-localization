"""Launchpad client service — wraps launchpadlib for profile, karma, teams."""

import json
from pathlib import Path
from typing import Optional

CREDENTIALS_DIR = Path.home() / ".cache" / "launchpad-bridge"
CREDENTIALS_FILE = CREDENTIALS_DIR / "credentials"

LANG_MAP = {
    "my":  "Myanmar",
    "shn": "Shan",
    "mnw": "Mon",
    "ksw": "S'gaw Karen",
}

# ── Auth helpers ───────────────────────────────────────────────────────

def is_authenticated() -> bool:
    """Check if Launchpad OAuth credentials are cached."""
    return CREDENTIALS_FILE.exists()


def get_auth_status() -> dict:
    """Return authentication status details."""
    if not is_authenticated():
        return {
            "authenticated": False,
            "setup_required": True,
            "setup_url": "https://login.launchpad.net/",
            "setup_command": "python ~/.claude/mcp-servers/launchpad-bridge/setup_auth.py",
        }

    try:
        from launchpadlib.launchpad import Launchpad
        lp = Launchpad.login_with(
            application_name="ubuntu-localization-tool",
            service_root="production",
            launchpadlib_dir=str(CREDENTIALS_DIR),
            credentials_file=str(CREDENTIALS_FILE),
            version="devel",
        )
        me = lp.me
        return {
            "authenticated": True,
            "username": str(me.name),
            "display_name": str(me.display_name),
            "web_link": str(me.web_link),
        }
    except Exception as e:
        return {
            "authenticated": False,
            "error": str(e),
            "setup_required": True,
        }


# ── Anonymous API ──────────────────────────────────────────────────────

def _get_anonymous_lp():
    """Get an anonymous Launchpad connection."""
    from launchpadlib.launchpad import Launchpad
    return Launchpad.login_anonymously(
        consumer_name="ubuntu-localization-tool",
        service_root="production",
        version="devel",
    )


def get_profile(username: str) -> Optional[dict]:
    """Get a user's public Launchpad profile."""
    try:
        lp = _get_anonymous_lp()
        person = lp.people[username]
        person.lp_refresh()
        return {
            "username": str(person.name),
            "display_name": str(person.display_name),
            "karma": _safe_int(person.karma),
            "web_link": str(person.web_link),
            "is_team": bool(getattr(person, "is_team", False)),
        }
    except Exception:
        return None


def get_karma(username: str) -> Optional[dict]:
    """Get detailed karma for a user."""
    try:
        lp = _get_anonymous_lp()
        person = lp.people[username]
        karma_total = _safe_int(getattr(person, "karma", 0))

        categories = []
        try:
            for entry in getattr(person, "karma_actions", []):
                categories.append({
                    "action": str(getattr(entry, "name", "unknown")),
                    "category": str(getattr(entry, "category", "unknown")),
                    "points": _safe_int(getattr(entry, "points", 0)),
                })
        except Exception:
            pass

        return {
            "username": str(person.name),
            "display_name": str(person.display_name),
            "total_karma": karma_total,
            "categories": categories[:20],
        }
    except Exception:
        return None


def get_teams(username: str, translation_only: bool = True) -> list[dict]:
    """Get team memberships for a user."""
    try:
        lp = _get_anonymous_lp()
        person = lp.people[username]
        teams = []
        for membership in getattr(person, "memberships_details", []):
            try:
                team = membership.team
                team_name = str(team.name)
                if translation_only and "translat" not in team_name.lower() and "ubuntu" not in team_name.lower():
                    continue
                teams.append({
                    "team_name": team_name,
                    "display_name": str(getattr(team, "display_name", team_name)),
                    "status": str(membership.status),
                    "web_link": str(getattr(team, "web_link", "")),
                })
            except Exception:
                pass
        return teams
    except Exception:
        return []


def get_my_profile() -> Optional[dict]:
    """Get the authenticated user's full profile."""
    if not is_authenticated():
        return None
    try:
        from launchpadlib.launchpad import Launchpad
        lp = Launchpad.login_with(
            application_name="ubuntu-localization-tool",
            service_root="production",
            launchpadlib_dir=str(CREDENTIALS_DIR),
            credentials_file=str(CREDENTIALS_FILE),
            version="devel",
        )
        me = lp.me
        me.lp_refresh()
        username = str(me.name)
        return {
            "username": username,
            "display_name": str(me.display_name),
            "karma": _safe_int(getattr(me, "karma", 0)),
            "web_link": str(me.web_link),
            "wiki_url": str(getattr(me, "wiki_url", "")),
            "teams": get_teams(username),
            "team_count": len(get_teams(username)),
        }
    except Exception:
        return None


def get_top_contributors(limit: int = 15) -> list[dict]:
    """Get top Ubuntu contributors."""
    try:
        lp = _get_anonymous_lp()
        contributors = []
        try:
            translators = lp.people["ubuntu-translators"]
            translators.lp_refresh()
            for member in getattr(translators, "members", []):
                if hasattr(member, "lp_refresh"):
                    member.lp_refresh()
                contributors.append({
                    "username": str(getattr(member, "name", "")),
                    "display_name": str(getattr(member, "display_name", "")),
                    "karma": _safe_int(getattr(member, "karma", 0)),
                })
                if len(contributors) >= limit:
                    break
        except Exception:
            pass
        return contributors
    except Exception:
        return []


# ── Helpers ────────────────────────────────────────────────────────────

def _safe_int(val) -> int:
    """Safely convert a value to int."""
    try:
        if isinstance(val, int):
            return val
        if isinstance(val, str) and val.isdigit():
            return int(val)
        return 0
    except Exception:
        return 0
