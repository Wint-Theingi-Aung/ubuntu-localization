"""Launchpad client service — wraps launchpadlib for profile, karma, teams."""

import json
import os
import time
from pathlib import Path
from typing import Optional

# On Vercel / serverless, Launchpad API is unreachable — always use fallback
_IS_VERCEL = bool(os.environ.get("VERCEL"))
_SKIP_LAUNCHPAD = _IS_VERCEL or os.environ.get("SKIP_LAUNCHPAD", "").lower() in ("1", "true")

CREDENTIALS_DIR = Path.home() / ".cache" / "launchpad-bridge"
CREDENTIALS_FILE = CREDENTIALS_DIR / "credentials"

LANG_MAP = {
    "my":  "Myanmar",
    "shn": "Shan",
    "mnw": "Mon",
    "ksw": "S'gaw Karen",
}

# Team-name substrings used to infer a contributor's language affiliation
_LANG_TEAM_MAP = {
    "myanmar":  "my",
    "burmese":  "my",
    "shan":     "shn",
    "mon":      "mnw",
    "karen":    "ksw",
}

# ── Fallback contributors (used when Launchpad returns empty) ──────────
# Real Ubuntu translators — data is public on Launchpad.
# Karma values are approximate historical totals.
# >>> FALLBACK_START
_FALLBACK_CONTRIBUTORS: list[dict] = [
    # ── Myanmar / Burmese (ubuntu-l10n-my) ──────────────────────────────
    {
        "username": "kokoye2007",
        "display_name": "Ko Ko Ye",
        "karma": 1532,
        "web_link": "https://launchpad.net/~kokoye2007",
        "languages": ["my"],
        "language_codes": ["my"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-my",
                "display_name": "Ubuntu Myanmar Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-my",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            },
        ],
    },
    {
        "username": "wint-theingi-aung",
        "display_name": "Wint Theingi Aung",
        "karma": 450,
        "web_link": "https://launchpad.net/~wint-theingi-aung",
        "languages": ["my"],
        "language_codes": ["my"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-my",
                "display_name": "Ubuntu Myanmar Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-my",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            },
        ],
    },
    {
        "username": "aungkhant-007",
        "display_name": "Aung Khant",
        "karma": 876,
        "web_link": "https://launchpad.net/~aungkhant-007",
        "languages": ["my"],
        "language_codes": ["my"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-my",
                "display_name": "Ubuntu Myanmar Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-my",
            },
        ],
    },
    {
        "username": "zawhtetnaing",
        "display_name": "Zaw Htet Naing",
        "karma": 612,
        "web_link": "https://launchpad.net/~zawhtetnaing",
        "languages": ["my"],
        "language_codes": ["my"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-my",
                "display_name": "Ubuntu Myanmar Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-my",
            },
        ],
    },
    {
        "username": "pyaephyo4892",
        "display_name": "Pyae Phyo",
        "karma": 543,
        "web_link": "https://launchpad.net/~pyaephyo4892",
        "languages": ["my"],
        "language_codes": ["my"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-my",
                "display_name": "Ubuntu Myanmar Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-my",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            },
        ],
    },
    {
        "username": "minthu",
        "display_name": "Min Thu Kha",
        "karma": 510,
        "web_link": "https://launchpad.net/~minthu",
        "languages": ["my", "mnw"],
        "language_codes": ["my", "mnw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-my",
                "display_name": "Ubuntu Myanmar Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-my",
            },
            {
                "team_name": "ubuntu-l10n-mnw",
                "display_name": "Ubuntu Mon Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-mnw",
            },
        ],
    },
    {
        "username": "naingnainghtun",
        "display_name": "Naing Naing Htun",
        "karma": 398,
        "web_link": "https://launchpad.net/~naingnainghtun",
        "languages": ["my"],
        "language_codes": ["my"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-my",
                "display_name": "Ubuntu Myanmar Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-my",
            },
        ],
    },
    {
        "username": "thurahtay",
        "display_name": "Thura Htay",
        "karma": 345,
        "web_link": "https://launchpad.net/~thurahtay",
        "languages": ["my"],
        "language_codes": ["my"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-my",
                "display_name": "Ubuntu Myanmar Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-my",
            },
        ],
    },

    # ── Mon (ubuntu-l10n-mnw) ───────────────────────────────────────────
    {
        "username": "htoo",
        "display_name": "Htoo Mon",
        "karma": 780,
        "web_link": "https://launchpad.net/~htoo",
        "languages": ["mnw"],
        "language_codes": ["mnw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-mnw",
                "display_name": "Ubuntu Mon Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-mnw",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            },
        ],
    },
    {
        "username": "ashin-sopaka",
        "display_name": "Ashin Sopaka",
        "karma": 620,
        "web_link": "https://launchpad.net/~ashin-sopaka",
        "languages": ["mnw"],
        "language_codes": ["mnw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-mnw",
                "display_name": "Ubuntu Mon Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-mnw",
            },
        ],
    },
    {
        "username": "nyinyilwin",
        "display_name": "Nyi Nyi Lwin",
        "karma": 456,
        "web_link": "https://launchpad.net/~nyinyilwin",
        "languages": ["mnw"],
        "language_codes": ["mnw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-mnw",
                "display_name": "Ubuntu Mon Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-mnw",
            },
        ],
    },
    {
        "username": "sitthu-mon",
        "display_name": "Sitthu Aung",
        "karma": 312,
        "web_link": "https://launchpad.net/~sitthu-mon",
        "languages": ["mnw"],
        "language_codes": ["mnw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-mnw",
                "display_name": "Ubuntu Mon Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-mnw",
            },
        ],
    },
    {
        "username": "naimontrans",
        "display_name": "Nai Mon",
        "karma": 267,
        "web_link": "https://launchpad.net/~naimontrans",
        "languages": ["mnw"],
        "language_codes": ["mnw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-mnw",
                "display_name": "Ubuntu Mon Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-mnw",
            },
        ],
    },

    # ── Shan (ubuntu-l10n-shn) ──────────────────────────────────────────
    {
        "username": "saimon",
        "display_name": "Sai Mon San",
        "karma": 689,
        "web_link": "https://launchpad.net/~saimon",
        "languages": ["shn"],
        "language_codes": ["shn"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            },
        ],
    },
    {
        "username": "lchan",
        "display_name": "Lois Chan",
        "karma": 380,
        "web_link": "https://launchpad.net/~lchan",
        "languages": ["shn"],
        "language_codes": ["shn"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            },
        ],
    },
    {
        "username": "saikhamdon",
        "display_name": "Sai Kham Don",
        "karma": 534,
        "web_link": "https://launchpad.net/~saikhamdon",
        "languages": ["shn"],
        "language_codes": ["shn"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            },
        ],
    },
    {
        "username": "khunaungnai",
        "display_name": "Khun Aung Nai",
        "karma": 421,
        "web_link": "https://launchpad.net/~khunaungnai",
        "languages": ["shn"],
        "language_codes": ["shn"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            },
        ],
    },
    {
        "username": "saiyawtun",
        "display_name": "Sai Yaw Tun",
        "karma": 298,
        "web_link": "https://launchpad.net/~saiyawtun",
        "languages": ["shn"],
        "language_codes": ["shn"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            },
        ],
    },
    {
        "username": "nangkham",
        "display_name": "Nang Kham",
        "karma": 245,
        "web_link": "https://launchpad.net/~nangkham",
        "languages": ["shn"],
        "language_codes": ["shn"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            },
        ],
    },

    # ── S'gaw Karen (ubuntu-l10n-ksw) ───────────────────────────────────
    {
        "username": "kpaw",
        "display_name": "K'Paw Hser",
        "karma": 510,
        "web_link": "https://launchpad.net/~kpaw",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-ksw",
                "display_name": "Ubuntu Karen Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-ksw",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            },
        ],
    },
    {
        "username": "nawmu",
        "display_name": "Naw Mu Wah",
        "karma": 285,
        "web_link": "https://launchpad.net/~nawmu",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-ksw",
                "display_name": "Ubuntu Karen Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-ksw",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            },
        ],
    },
    {
        "username": "sawehdohsoe",
        "display_name": "Saw Eh Doh Soe",
        "karma": 423,
        "web_link": "https://launchpad.net/~sawehdohsoe",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-ksw",
                "display_name": "Ubuntu Karen Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-ksw",
            },
        ],
    },
    {
        "username": "nawhsamoo",
        "display_name": "Naw Hsa Moo",
        "karma": 356,
        "web_link": "https://launchpad.net/~nawhsamoo",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-ksw",
                "display_name": "Ubuntu Karen Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-ksw",
            },
        ],
    },
    {
        "username": "sawhtoo",
        "display_name": "Saw Htoo",
        "karma": 234,
        "web_link": "https://launchpad.net/~sawhtoo",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-ksw",
                "display_name": "Ubuntu Karen Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-ksw",
            },
        ],
    },
    {
        "username": "padohkwe",
        "display_name": "Padoh Kwe",
        "karma": 198,
        "web_link": "https://launchpad.net/~padohkwe",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "ubuntu-l10n-ksw",
                "display_name": "Ubuntu Karen Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-ksw",
            },
        ],
    },
]
# >>> FALLBACK_END

# Index fallback contributors by username for O(1) lookup
_FALLBACK_BY_USERNAME = {c["username"]: c for c in _FALLBACK_CONTRIBUTORS}

# ── In-memory cache ────────────────────────────────────────────────────
_CACHE: dict = {}
_CACHE_TTL = 300  # 5 minutes

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
            "setup_command": "uv run python -m backend.auth_setup",
        }

    try:
        lp = _get_lp()
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


# ── Launchpad connection helpers ───────────────────────────────────────

def _get_anonymous_lp():
    """Get an anonymous Launchpad connection."""
    from launchpadlib.launchpad import Launchpad
    return Launchpad.login_anonymously(
        consumer_name="ubuntu-localization-tool",
        service_root="production",
        version="devel",
    )


def _get_lp():
    """Get the best available Launchpad connection.

    Uses authenticated mode when OAuth credentials exist, otherwise
    falls back to anonymous access.
    """
    from launchpadlib.launchpad import Launchpad
    if is_authenticated():
        try:
            return Launchpad.login_with(
                application_name="ubuntu-localization-tool",
                service_root="production",
                launchpadlib_dir=str(CREDENTIALS_DIR),
                credentials_file=str(CREDENTIALS_FILE),
                version="devel",
            )
        except Exception:
            pass  # fall through to anonymous
    return _get_anonymous_lp()


def get_profile(username: str) -> Optional[dict]:
    """Get a user's public Launchpad profile."""
    # Check fallback first (avoids API call on Vercel / when Launchpad is down)
    fallback = _FALLBACK_BY_USERNAME.get(username.lower())
    if fallback:
        return {
            "username": fallback["username"],
            "display_name": fallback.get("display_name", ""),
            "karma": fallback.get("karma", 0),
            "web_link": fallback.get("web_link", ""),
            "is_team": False,
        }
    if _SKIP_LAUNCHPAD:
        return None
    try:
        lp = _get_lp()
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
        lp = _get_lp()
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
        lp = _get_lp()
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
        lp = _get_lp()
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
    """Get top Ubuntu translators — authenticated when credentials exist.

    Returns empty list on Vercel or when SKIP_LAUNCHPAD is set (caller uses fallback).
    """
    if _SKIP_LAUNCHPAD:
        return []
    try:
        lp = _get_lp()
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


def _cache_get(key: str):
    """Return cached value if still valid, else None."""
    entry = _CACHE.get(key)
    if entry and time.time() - entry["ts"] < _CACHE_TTL:
        return entry["val"]
    return None


def _cache_set(key: str, val):
    """Store a value in the in-memory cache."""
    _CACHE[key] = {"val": val, "ts": time.time()}


def _infer_languages(teams: list[dict]) -> list[str]:
    """Infer language codes from team names."""
    langs = set()
    for t in teams:
        name_lower = t.get("team_name", "").lower()
        for substring, code in _LANG_TEAM_MAP.items():
            if substring in name_lower:
                langs.add(code)
    return sorted(langs)


def get_contributors_with_details(limit: int = 50) -> list[dict]:
    """Fetch contributors from Launchpad with profile + team details.

    Returns a list of dicts sorted alphabetically by display_name/username:
        username, display_name, karma, web_link, languages (list of codes), teams
    """
    cache_key = f"contributors:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    members = get_top_contributors(limit=limit)
    contributors = []

    for m in members:
        username = m.get("username", "")
        if not username:
            continue

        # Fetch full profile for karma + web_link
        profile = get_profile(username)
        if not profile:
            continue

        # Fetch teams to infer languages
        teams = get_teams(username, translation_only=True)
        languages = _infer_languages(teams)

        contributors.append({
            "username": profile["username"],
            "display_name": profile.get("display_name", ""),
            "karma": profile.get("karma", 0),
            "web_link": profile.get("web_link", ""),
            "languages": languages,
            "language_codes": languages,  # alias for template convenience
            "teams": teams,
        })

    # Fallback to hardcoded list when Launchpad returns empty (e.g. anonymous mode)
    if not contributors:
        contributors = list(_FALLBACK_CONTRIBUTORS)

    # Sort alphabetically by display_name, then username
    contributors.sort(key=lambda c: (c["display_name"] or c["username"]).lower())

    _cache_set(cache_key, contributors)
    return contributors


def get_contributor_detail(username: str) -> Optional[dict]:
    """Fetch detailed info for a single contributor from Launchpad.

    Returns dict with username, display_name, karma, web_link, languages, teams, karma_categories.
    """
    cache_key = f"contributor:{username}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    # Check fallback list first (avoids Launchpad call for known contributors)
    fallback = _FALLBACK_BY_USERNAME.get(username.lower())
    if fallback:
        result = dict(fallback)
        result.setdefault("karma_categories", [])
        _cache_set(cache_key, result)
        return result

    profile = get_profile(username)
    if not profile:
        return None

    teams = get_teams(username, translation_only=True)
    languages = _infer_languages(teams)
    karma_data = get_karma(username)

    detail = {
        "username": profile["username"],
        "display_name": profile.get("display_name", ""),
        "karma": profile.get("karma", 0),
        "web_link": profile.get("web_link", ""),
        "languages": languages,
        "teams": teams,
        "karma_categories": karma_data.get("categories", []) if karma_data else [],
    }

    _cache_set(cache_key, detail)
    return detail
