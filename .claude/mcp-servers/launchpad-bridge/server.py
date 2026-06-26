#!/usr/bin/env python3
"""
Launchpad Bridge MCP Server
----------------------------
Bridges Claude Code to the Launchpad API via launchpadlib.

Exposes tools for:
- User profile lookup (karma, display name, wiki URL)
- Team memberships (Ubuntu Translators, language teams, etc.)
- Translation group stats (per-language completion percentages)
- Top contributors list
- Person-specific translation contributions

Authentication:
- Read-only operations use anonymous login (no credentials needed)
- Authenticated operations use cached OAuth credentials
- First-time setup: run `python setup_auth.py` to authorize
"""

import json
import os
import sys
import asyncio
from datetime import datetime
from pathlib import Path

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from launchpadlib.launchpad import Launchpad
from launchpadlib.credentials import Credentials
from launchpadlib.errors import HTTPError

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CREDENTIALS_DIR = Path.home() / ".cache" / "launchpad-bridge"
CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
CREDENTIALS_FILE = CREDENTIALS_DIR / "credentials"
APP_NAME = "ubuntu-localization-tool"

# Ubuntu distribution name on Launchpad
UBUNTU_DISTRO = "ubuntu"

# Well-known Ubuntu translation teams
TRANSLATION_TEAMS = [
    "ubuntu-translators",
    "ubuntu-burmese-translators",
    "ubuntu-shan-translators",
    "ubuntu-mon-translators",
    "ubuntu-karen-translators",
    "launchpad-translators",
]

# Language codes mapping
LANG_MAP = {
    "my":  "Burmese",
    "shn": "Shan",
    "mnw": "Mon",
    "ksw": "S'gaw Karen",
}

# ---------------------------------------------------------------------------
# Launchpad connection management
# ---------------------------------------------------------------------------

_launchpad_cache = None

def _get_launchpad(anonymous: bool = True):
    """Get a Launchpad connection, with caching."""
    global _launchpad_cache
    if _launchpad_cache is not None:
        try:
            # Test if connection is still alive
            _launchpad_cache.me
            return _launchpad_cache
        except Exception:
            _launchpad_cache = None

    try:
        if anonymous:
            lp = Launchpad.login_anonymously(
                consumer_name=APP_NAME,
                service_root="production",
                launchpadlib_dir=str(CREDENTIALS_DIR),
                version="devel",
            )
        else:
            lp = Launchpad.login_with(
                application_name=APP_NAME,
                service_root="production",
                launchpadlib_dir=str(CREDENTIALS_DIR),
                credentials_file=str(CREDENTIALS_FILE),
                version="devel",
            )
        _launchpad_cache = lp
        return lp
    except Exception as e:
        print(f"Launchpad connection error: {e}", file=sys.stderr)
        return None


def _check_auth_available() -> dict:
    """Check if authenticated access is available."""
    if CREDENTIALS_FILE.exists():
        try:
            lp = Launchpad.login_with(
                application_name=APP_NAME,
                service_root="production",
                launchpadlib_dir=str(CREDENTIALS_DIR),
                credentials_file=str(CREDENTIALS_FILE),
                version="devel",
            )
            me = lp.me
            return {
                "authenticated": True,
                "username": me.name,
                "display_name": me.display_name,
            }
        except Exception as e:
            return {
                "authenticated": False,
                "reason": str(e),
                "setup_required": True,
                "setup_command": f"python {Path(__file__).parent}/setup_auth.py",
            }
    return {
        "authenticated": False,
        "reason": "No credentials file found. Run setup_auth.py first.",
        "setup_required": True,
    }


# ---------------------------------------------------------------------------
# Safe API helpers
# ---------------------------------------------------------------------------

def _safe_get(obj, attr, default=None):
    """Safely get an attribute from a Launchpad object."""
    try:
        val = getattr(obj, attr, None)
        if val is None:
            return default
        if callable(val):
            return default
        return str(val) if not isinstance(val, (dict, list, bool, int, float)) else val
    except Exception:
        return default


def _person_to_dict(person) -> dict:
    """Convert a Launchpad person object to a JSON-safe dict."""
    return {
        "name": _safe_get(person, "name", ""),
        "display_name": _safe_get(person, "display_name", ""),
        "karma": _safe_get(person, "karma", 0),
        "web_link": _safe_get(person, "web_link", ""),
        "is_team": _safe_get(person, "is_team", False),
        "is_ubuntu_member": _safe_get(person, "is_ubuntu_member", False),
    }


# ---------------------------------------------------------------------------
# MCP Server Setup
# ---------------------------------------------------------------------------

server = Server("launchpad-bridge")

# ── Tool: check_auth_status ─────────────────────────────────────────────

@server.call_tool()
async def check_auth_status(name: str, arguments: dict) -> list[TextContent]:
    """Check Launchpad authentication status."""
    status = _check_auth_available()
    return [TextContent(
        type="text",
        text=json.dumps(status, indent=2, ensure_ascii=False)
    )]


# ── Tool: get_profile ───────────────────────────────────────────────────

@server.call_tool()
async def get_profile(name: str, arguments: dict) -> list[TextContent]:
    """Get a Launchpad user profile by username.

    Args:
        username: Launchpad username (e.g., 'wint-theingi-aung')
    """
    username = arguments.get("username", "").strip()
    if not username:
        return [TextContent(type="text", text=json.dumps(
            {"error": "username is required"}, indent=2
        ))]

    lp = _get_launchpad(anonymous=True)
    if lp is None:
        return [TextContent(type="text", text=json.dumps(
            {"error": "Failed to connect to Launchpad"}, indent=2
        ))]

    try:
        person = lp.people[username]
        # Force-load the resource
        person.lp_refresh()

        result = _person_to_dict(person)

        # Try to get extra fields
        for field in ["time_zone", "languages", "wiki_url", "irc_nicks"]:
            try:
                val = _safe_get(person, field, None)
                if val:
                    result[field] = val
            except Exception:
                pass

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, ensure_ascii=False)
        )]
    except HTTPError as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": f"Person not found: {username}", "detail": str(e)},
            indent=2
        ))]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": str(e)}, indent=2
        ))]


# ── Tool: get_karma ─────────────────────────────────────────────────────

@server.call_tool()
async def get_karma(name: str, arguments: dict) -> list[TextContent]:
    """Get karma details for a Launchpad user.

    Args:
        username: Launchpad username
    """
    username = arguments.get("username", "").strip()
    if not username:
        return [TextContent(type="text", text=json.dumps(
            {"error": "username is required"}, indent=2
        ))]

    lp = _get_launchpad(anonymous=True)
    if lp is None:
        return [TextContent(type="text", text=json.dumps(
            {"error": "Failed to connect to Launchpad"}, indent=2
        ))]

    try:
        person = lp.people[username]
        person.lp_refresh()

        karma_total = _safe_get(person, "karma", 0)
        if isinstance(karma_total, str):
            karma_total = int(karma_total) if karma_total.isdigit() else 0

        # Try to get karma breakdown by category
        karma_categories = []
        try:
            for entry in person.karma_actions:
                try:
                    karma_categories.append({
                        "action": _safe_get(entry, "name", "unknown"),
                        "category": _safe_get(entry, "category", "unknown"),
                        "points": _safe_get(entry, "points", 0),
                    })
                except Exception:
                    pass
        except Exception:
            pass

        result = {
            "username": _safe_get(person, "name", username),
            "display_name": _safe_get(person, "display_name", ""),
            "total_karma": karma_total,
            "karma_categories": karma_categories[:20],  # limit
            "web_link": _safe_get(person, "web_link", ""),
        }

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, ensure_ascii=False)
        )]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": str(e)}, indent=2
        ))]


# ── Tool: get_teams ─────────────────────────────────────────────────────

@server.call_tool()
async def get_teams(name: str, arguments: dict) -> list[TextContent]:
    """Get team memberships for a Launchpad user.

    Args:
        username: Launchpad username
        filter_translation: If true, only return translation-related teams (default: true)
    """
    username = arguments.get("username", "").strip()
    filter_translation = arguments.get("filter_translation", True)

    if not username:
        return [TextContent(type="text", text=json.dumps(
            {"error": "username is required"}, indent=2
        ))]

    lp = _get_launchpad(anonymous=True)
    if lp is None:
        return [TextContent(type="text", text=json.dumps(
            {"error": "Failed to connect to Launchpad"}, indent=2
        ))]

    try:
        person = lp.people[username]
        person.lp_refresh()

        teams = []
        try:
            for membership in person.memberships_details:
                try:
                    team = membership.team
                    team_name = _safe_get(team, "name", "")

                    # Filter if requested
                    if filter_translation:
                        is_translation = any(
                            keyword in team_name.lower()
                            for keyword in ["translat", "l10n", "i18n", "lang", "ubuntu"]
                        )
                        if not is_translation:
                            continue

                    teams.append({
                        "team_name": team_name,
                        "display_name": _safe_get(team, "display_name", ""),
                        "web_link": _safe_get(team, "web_link", ""),
                        "status": _safe_get(membership, "status", ""),
                        "is_translation_team": "translat" in team_name.lower(),
                    })
                except Exception:
                    pass
        except Exception:
            pass

        result = {
            "username": _safe_get(person, "name", username),
            "display_name": _safe_get(person, "display_name", ""),
            "team_count": len(teams),
            "teams": teams,
        }

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, ensure_ascii=False)
        )]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": str(e)}, indent=2
        ))]


# ── Tool: get_translation_groups ────────────────────────────────────────

@server.call_tool()
async def get_translation_groups(name: str, arguments: dict) -> list[TextContent]:
    """Get Ubuntu translation groups and their status.

    Args:
        group_name: Optional specific group name (e.g., 'ubuntu-translators')
    """
    group_name = arguments.get("group_name", "").strip()

    lp = _get_launchpad(anonymous=True)
    if lp is None:
        return [TextContent(type="text", text=json.dumps(
            {"error": "Failed to connect to Launchpad"}, indent=2
        ))]

    try:
        groups = []

        if group_name:
            # Get specific group
            try:
                tg = lp.translation_groups[group_name]
                tg.lp_refresh()
                groups.append({
                    "name": _safe_get(tg, "name", group_name),
                    "title": _safe_get(tg, "title", ""),
                    "summary": _safe_get(tg, "summary", ""),
                    "web_link": _safe_get(tg, "web_link", ""),
                    "languages_count": _safe_get(tg, "languages_count", 0),
                })
            except HTTPError:
                return [TextContent(type="text", text=json.dumps(
                    {"error": f"Translation group not found: {group_name}"},
                    indent=2
                ))]
        else:
            # List top-level Ubuntu translation groups
            try:
                for tg in lp.translation_groups:
                    try:
                        tg.lp_refresh()
                        groups.append({
                            "name": _safe_get(tg, "name", ""),
                            "title": _safe_get(tg, "title", ""),
                            "summary": _safe_get(tg, "summary", ""),
                            "web_link": _safe_get(tg, "web_link", ""),
                        })
                    except Exception:
                        pass
            except Exception:
                pass

        result = {
            "translation_groups": groups[:50],  # limit
            "count": len(groups),
            "note": "ubuntu-translators is the main Ubuntu translation team",
        }

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, ensure_ascii=False)
        )]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": str(e)}, indent=2
        ))]


# ── Tool: get_top_contributors ──────────────────────────────────────────

@server.call_tool()
async def get_top_contributors(name: str, arguments: dict) -> list[TextContent]:
    """Get top contributors to Ubuntu translations.

    Args:
        limit: Number of contributors to return (default: 20)
    """
    limit = arguments.get("limit", 20)

    lp = _get_launchpad(anonymous=True)
    if lp is None:
        return [TextContent(type="text", text=json.dumps(
            {"error": "Failed to connect to Launchpad"}, indent=2
        ))]

    try:
        contributors = []
        ubuntu = lp.distributions[UBUNTU_DISTRO]

        # Try to get top contributors from the distribution
        try:
            for person_entry in ubuntu.top_contributors:
                try:
                    person = person_entry
                    person.lp_refresh() if hasattr(person, 'lp_refresh') else None
                    contributors.append({
                        "username": _safe_get(person, "name", ""),
                        "display_name": _safe_get(person, "display_name", ""),
                        "karma": _safe_get(person, "karma", 0),
                        "web_link": _safe_get(person, "web_link", ""),
                    })
                    if len(contributors) >= limit:
                        break
                except Exception:
                    pass
        except Exception:
            # Alternative: scan known translation teams
            try:
                translators = lp.people["ubuntu-translators"]
                translators.lp_refresh()
                for member in translators.members:
                    try:
                        member.lp_refresh() if hasattr(member, 'lp_refresh') else None
                        contributors.append({
                            "username": _safe_get(member, "name", ""),
                            "display_name": _safe_get(member, "display_name", ""),
                            "karma": _safe_get(member, "karma", 0),
                            "web_link": _safe_get(member, "web_link", ""),
                        })
                        if len(contributors) >= limit:
                            break
                    except Exception:
                        pass
            except Exception:
                pass

        result = {
            "source": "ubuntu",
            "contributors": contributors,
            "count": len(contributors),
        }

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, ensure_ascii=False)
        )]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": str(e)}, indent=2
        ))]


# ── Tool: get_my_profile ────────────────────────────────────────────────

@server.call_tool()
async def get_my_profile(name: str, arguments: dict) -> list[TextContent]:
    """Get the authenticated user's own profile, karma, and teams summary.

    Requires authentication via setup_auth.py first.
    """
    auth_status = _check_auth_available()
    if not auth_status["authenticated"]:
        return [TextContent(type="text", text=json.dumps({
            "error": "Not authenticated",
            "setup_required": True,
            "setup_command": f"python {Path(__file__).parent}/setup_auth.py",
            "setup_url": "https://help.launchpad.net/API/SigningRequests",
        }, indent=2))]

    try:
        lp = _get_launchpad(anonymous=False)
        if lp is None:
            return [TextContent(type="text", text=json.dumps(
                {"error": "Failed to connect to Launchpad (authenticated)"}, indent=2
            ))]

        me = lp.me
        me.lp_refresh()

        # Profile
        profile = _person_to_dict(me)
        for field in ["time_zone", "wiki_url", "irc_nicks"]:
            val = _safe_get(me, field, None)
            if val:
                profile[field] = val

        # Karma
        karma_total = _safe_get(me, "karma", 0)
        if isinstance(karma_total, str):
            karma_total = int(karma_total) if karma_total.isdigit() else 0

        # Teams
        teams = []
        try:
            for membership in me.memberships_details:
                try:
                    team = membership.team
                    teams.append({
                        "team_name": _safe_get(team, "name", ""),
                        "display_name": _safe_get(team, "display_name", ""),
                        "status": _safe_get(membership, "status", ""),
                        "web_link": _safe_get(team, "web_link", ""),
                    })
                except Exception:
                    pass
        except Exception:
            pass

        result = {
            "profile": profile,
            "total_karma": karma_total,
            "teams": teams,
            "team_count": len(teams),
            "suggested_languages": [
                lang for code, lang in LANG_MAP.items()
                if any(code.lower() in t["team_name"].lower() for t in teams)
            ] or list(LANG_MAP.values()),
        }

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, ensure_ascii=False)
        )]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": str(e)}, indent=2
        ))]


# ── Tool: search_people ─────────────────────────────────────────────────

@server.call_tool()
async def search_people(name: str, arguments: dict) -> list[TextContent]:
    """Search for Launchpad users/teams by name.

    Args:
        query: Search text (name, username, or display name)
        limit: Max results (default: 10)
    """
    query = arguments.get("query", "").strip()
    limit = arguments.get("limit", 10)

    if not query or len(query) < 2:
        return [TextContent(type="text", text=json.dumps(
            {"error": "query must be at least 2 characters"}, indent=2
        ))]

    lp = _get_launchpad(anonymous=True)
    if lp is None:
        return [TextContent(type="text", text=json.dumps(
            {"error": "Failed to connect to Launchpad"}, indent=2
        ))]

    try:
        results = []
        try:
            for person in lp.people:
                try:
                    name = _safe_get(person, "name", "")
                    display = _safe_get(person, "display_name", "")
                    if query.lower() in name.lower() or query.lower() in display.lower():
                        results.append(_person_to_dict(person))
                        if len(results) >= limit:
                            break
                except Exception:
                    pass
        except HTTPError:
            # Fallback: try direct lookup
            pass

        # If no results from scan, try direct lookup
        if not results:
            try:
                person = lp.people[query]
                person.lp_refresh()
                results.append(_person_to_dict(person))
            except HTTPError:
                pass

        return [TextContent(
            type="text",
            text=json.dumps({
                "query": query,
                "results": results,
                "count": len(results),
            }, indent=2, ensure_ascii=False)
        )]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": str(e)}, indent=2
        ))]


# ── Tool: get_translation_progress ──────────────────────────────────────

@server.call_tool()
async def get_translation_progress(name: str, arguments: dict) -> list[TextContent]:
    """Get Ubuntu translation progress for a specific language.

    Args:
        lang_code: Language code (my, shn, mnw, ksw)
    """
    lang_code = arguments.get("lang_code", "").strip().lower()
    if lang_code not in LANG_MAP:
        return [TextContent(type="text", text=json.dumps({
            "error": f"Unsupported language code: {lang_code}",
            "supported": list(LANG_MAP.keys()),
            "supported_names": list(LANG_MAP.values()),
        }, indent=2))]

    lp = _get_launchpad(anonymous=True)
    if lp is None:
        return [TextContent(type="text", text=json.dumps(
            {"error": "Failed to connect to Launchpad"}, indent=2
        ))]

    try:
        lang_name = LANG_MAP[lang_code]
        ubuntu = lp.distributions[UBUNTU_DISTRO]

        translation_stats = []

        # Try to get translation templates with per-language stats
        try:
            for template in ubuntu.translation_templates:
                try:
                    template.lp_refresh() if hasattr(template, 'lp_refresh') else None
                    name = _safe_get(template, "name", "")
                    total = _safe_get(template, "message_count", 0)

                    # Get the .po file for this language
                    try:
                        pofile = template.getPOFileByLanguage(lang_code)
                        if pofile:
                            pofile.lp_refresh() if hasattr(pofile, 'lp_refresh') else None
                            translated = _safe_get(pofile, "translated_count", 0)
                            untranslated = _safe_get(pofile, "untranslated_count", 0)
                            pct = (int(translated) / int(total) * 100) if int(total) > 0 else 0

                            translation_stats.append({
                                "template": name,
                                "total": int(total) if isinstance(total, str) and total.isdigit() else total,
                                "translated": int(translated) if isinstance(translated, str) and translated.isdigit() else translated,
                                "untranslated": int(untranslated) if isinstance(untranslated, str) and untranslated.isdigit() else untranslated,
                                "completion_pct": round(pct, 1),
                            })
                    except Exception:
                        pass

                    if len(translation_stats) >= 20:
                        break
                except Exception:
                    pass
        except Exception:
            pass

        result = {
            "language": lang_name,
            "lang_code": lang_code,
            "templates": translation_stats,
            "template_count": len(translation_stats),
            "note": "If empty, try directly on https://translations.launchpad.net/ubuntu",
        }

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, ensure_ascii=False)
        )]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": str(e)}, indent=2
        ))]


# ---------------------------------------------------------------------------
# Tool listing
# ---------------------------------------------------------------------------

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="launchpad_check_auth_status",
            description="Check if Launchpad authentication is set up. Returns auth status and setup instructions if needed.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="launchpad_get_profile",
            description="Get a Launchpad user's public profile by username. Returns name, display name, karma, web links.",
            inputSchema={
                "type": "object",
                "properties": {
                    "username": {
                        "type": "string",
                        "description": "Launchpad username (e.g., 'wint-theingi-aung')",
                    },
                },
                "required": ["username"],
            },
        ),
        Tool(
            name="launchpad_get_karma",
            description="Get detailed karma breakdown for a Launchpad user. Shows total karma and per-category karma actions.",
            inputSchema={
                "type": "object",
                "properties": {
                    "username": {
                        "type": "string",
                        "description": "Launchpad username",
                    },
                },
                "required": ["username"],
            },
        ),
        Tool(
            name="launchpad_get_teams",
            description="Get team memberships for a Launchpad user. Optionally filter to translation-related teams only.",
            inputSchema={
                "type": "object",
                "properties": {
                    "username": {
                        "type": "string",
                        "description": "Launchpad username",
                    },
                    "filter_translation": {
                        "type": "boolean",
                        "description": "Only show translation-related teams (default: true)",
                        "default": True,
                    },
                },
                "required": ["username"],
            },
        ),
        Tool(
            name="launchpad_get_translation_groups",
            description="Get Ubuntu translation groups and their status. Returns group names, titles, and member counts.",
            inputSchema={
                "type": "object",
                "properties": {
                    "group_name": {
                        "type": "string",
                        "description": "Optional specific group name (e.g., 'ubuntu-translators'). If omitted, lists all groups.",
                    },
                },
            },
        ),
        Tool(
            name="launchpad_get_top_contributors",
            description="Get top contributors to Ubuntu translations, sorted by karma/contributions.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of contributors to return (default: 20)",
                        "default": 20,
                    },
                },
            },
        ),
        Tool(
            name="launchpad_get_my_profile",
            description="Get YOUR authenticated profile, karma, and team memberships. Requires running setup_auth.py first for OAuth login.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="launchpad_search_people",
            description="Search for Launchpad users/teams by name or username.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search text (name, username, or display name — min 2 chars)",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results (default: 10)",
                        "default": 10,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="launchpad_get_translation_progress",
            description="Get Ubuntu translation progress for a specific language (Burmese/Shan/Mon/Karen). Shows per-template completion percentages.",
            inputSchema={
                "type": "object",
                "properties": {
                    "lang_code": {
                        "type": "string",
                        "description": "Language code: my (Burmese), shn (Shan), mnw (Mon), ksw (S'gaw Karen)",
                        "enum": ["my", "shn", "mnw", "ksw"],
                    },
                },
                "required": ["lang_code"],
            },
        ),
    ]


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def main():
    async with stdio_server() as (reader, writer):
        await server.run(reader, writer, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
