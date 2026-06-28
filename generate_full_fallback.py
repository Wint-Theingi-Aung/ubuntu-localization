#!/usr/bin/env python3
"""Fetch ALL members of Ubuntu translation teams from Launchpad REST API
and write them into the _FALLBACK_CONTRIBUTORS array in launchpad_client.py.

No OAuth needed — uses the public Launchpad REST API with full pagination.

Usage:
    uv run python generate_full_fallback.py
"""

import json
import time
import urllib.request
import urllib.error

API_BASE = "https://api.launchpad.net/devel"
TEAMS: list[dict] = [
    {
        "team_name": "ubuntu-l10n-my",
        "display_name": "Ubuntu Myanmar Translators",
        "web_link": "https://launchpad.net/~ubuntu-l10n-my",
        "lang": "my",
    },
    {
        "team_name": "ubuntu-l10n-mnw",
        "display_name": "Ubuntu Mon Translators",
        "web_link": "https://launchpad.net/~ubuntu-l10n-mnw",
        "lang": "mnw",
    },
    {
        "team_name": "ubuntu-l10n-shn",
        "display_name": "Ubuntu Shan Translators",
        "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
        "lang": "shn",
    },
    # NOTE: ubuntu-l10n-ksw does NOT exist on Launchpad.
    # linuxmint-translation-team-ksw is the only S'gaw Karen team.
    {
        "team_name": "linuxmint-translation-team-ksw",
        "display_name": "S'gaw Karen Translation Team for Linux Mint",
        "web_link": "https://launchpad.net/~linuxmint-translation-team-ksw",
        "lang": "ksw",
    },
]

UTF = {  # Ubuntu Translators (common super-team)
    "team_name": "ubuntu-translators",
    "display_name": "Ubuntu Translators",
    "status": "Approved",
    "web_link": "https://launchpad.net/~ubuntu-translators",
}

OUTPUT_FILE = "backend/services/launchpad_client.py"

START_MARKER = "# >>> FALLBACK_START"
END_MARKER = "# >>> FALLBACK_END"


def api_get(url: str) -> dict:
    """GET a Launchpad API URL and return parsed JSON. Rate-limit 1 req/s."""
    time.sleep(0.15)  # be gentle with the API
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def fetch_team_members(team_name: str) -> list[dict]:
    """Fetch ALL members of a team, following all pagination pages.

    Returns list of {username, display_name, karma, web_link}.
    """
    members: list[dict] = []
    url = f"{API_BASE}/~{team_name}/members"
    page = 0

    while url:
        page += 1
        data = api_get(url)
        entries = data.get("entries", [])
        total = data.get("total_size", 0)
        print(f"    page {page}: {len(entries)} entries (total: {total})")

        for entry in entries:
            name = entry.get("name", "")
            if not name:
                continue
            members.append({
                "username": name,
                "display_name": entry.get("display_name", name),
                "karma": entry.get("karma", 0) or 0,
                "web_link": entry.get("web_link", f"https://launchpad.net/~{name}"),
            })

        # Follow next_collection_link for pagination
        url = data.get("next_collection_link")
        if url:
            print(f"    → next page: {url}")

    print(f"    ✓ total fetched: {len(members)}")
    return members


def build_fallback_array(team_members: dict[str, list[dict]], min_karma: int = 1) -> str:
    """Build the Python source for _FALLBACK_CONTRIBUTORS from team->members map.

    Only includes members with karma >= min_karma (skips inactive/zero-karma members).
    """

    contributor_map: dict[str, dict] = {}  # username -> contributor data

    for team_info in TEAMS:
        team_name = team_info["team_name"]
        lang = team_info["lang"]
        members = team_members.get(team_name, [])

        for member in members:
            if member["karma"] < min_karma:
                continue
            username = member["username"]
            if username not in contributor_map:
                contributor_map[username] = {
                    "username": username,
                    "display_name": member["display_name"],
                    "karma": member["karma"],
                    "web_link": member["web_link"],
                    "languages": [],
                    "language_codes": [],
                    "teams": [],
                }

            c = contributor_map[username]
            if lang not in c["languages"]:
                c["languages"].append(lang)
                c["language_codes"].append(lang)

            # Use higher karma if available
            if member["karma"] > c["karma"]:
                c["karma"] = member["karma"]
            if member["display_name"] and member["display_name"] != username:
                c["display_name"] = member["display_name"]

            # Add team membership (deduplicated)
            team_entry = {
                "team_name": team_info["team_name"],
                "display_name": team_info["display_name"],
                "status": "Approved",
                "web_link": team_info["web_link"],
            }
            if team_entry not in c["teams"]:
                c["teams"].append(team_entry)

            # Most contributors are also in ubuntu-translators
            utf_copy = dict(UTF)
            c["teams"].append(utf_copy)  # will be deduped later

    # Deduplicate and sort teams
    for c in contributor_map.values():
        # Deduplicate teams by team_name
        seen = set()
        unique_teams = []
        for t in c["teams"]:
            tn = t["team_name"]
            if tn not in seen:
                seen.add(tn)
                unique_teams.append(t)
        c["teams"] = unique_teams

        # Sort languages
        c["languages"] = sorted(c["languages"])
        c["language_codes"] = sorted(c["language_codes"])

    # Sort contributors: by karma desc then name
    sorted_contribs = sorted(
        contributor_map.values(),
        key=lambda c: (-c["karma"], c["display_name"].lower()),
    )

    # Generate Python source
    lines = []
    lines.append("_FALLBACK_CONTRIBUTORS: list[dict] = [")
    for i, c in enumerate(sorted_contribs):
        lines.append(f"    {{")
        lines.append(f'        "username": {json.dumps(c["username"])},')
        lines.append(f'        "display_name": {json.dumps(c["display_name"])},')
        lines.append(f'        "karma": {c["karma"]},')
        lines.append(f'        "web_link": {json.dumps(c["web_link"])},')
        lines.append(f'        "languages": {json.dumps(c["languages"])},')
        lines.append(f'        "language_codes": {json.dumps(c["language_codes"])},')
        lines.append(f'        "teams": [')
        for j, t in enumerate(c["teams"]):
            comma = "," if j < len(c["teams"]) - 1 else ""
            lines.append(f"            {{")
            lines.append(f'                "team_name": {json.dumps(t["team_name"])},')
            lines.append(f'                "display_name": {json.dumps(t["display_name"])},')
            lines.append(f'                "status": {json.dumps(t["status"])},')
            lines.append(f'                "web_link": {json.dumps(t["web_link"])},')
            lines.append(f"            }}{comma}")
        lines.append(f"        ],")
        comma = "," if i < len(sorted_contribs) - 1 else ""
        lines.append(f"    }}{comma}")
    lines.append("]")

    return "\n".join(lines)


def update_launchpad_client(fallback_source: str) -> None:
    """Replace the _FALLBACK_CONTRIBUTORS block in launchpad_client.py."""

    # Read existing file
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    if START_MARKER not in content or END_MARKER not in content:
        print("ERROR: Could not find FALLBACK_START / FALLBACK_END markers!")
        return

    # Build new block: keep the marker comments
    new_block = f"{START_MARKER}\n{fallback_source}\n{END_MARKER}"

    # Replace between markers (including markers)
    start_idx = content.index(START_MARKER)
    end_idx = content.index(END_MARKER) + len(END_MARKER)

    new_content = content[:start_idx] + new_block + content[end_idx:]

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"\n✓ Updated {OUTPUT_FILE}")
    lang_counts = {}
    for line in fallback_source.split("\n"):
        if '"language_codes":' in line:
            try:
                codes = json.loads(
                    line.split('"language_codes":')[1].rstrip(",")
                )
                for lc in codes:
                    lang_counts[lc] = lang_counts.get(lc, 0) + 1
            except Exception:
                pass
    print(f"  Total contributors: {fallback_source.count('\"username\":')}")
    print(f"  By language: {lang_counts}")


def main():
    print("=" * 60)
    print("Fetching ALL Ubuntu translation team members from Launchpad")
    print("=" * 60)

    team_members: dict[str, list[dict]] = {}

    for team_info in TEAMS:
        team_name = team_info["team_name"]
        display_name = team_info["display_name"]
        print(f"\n▶ {display_name} (~{team_name})")
        try:
            members = fetch_team_members(team_name)
        except urllib.error.HTTPError as e:
            print(f"  ✗ HTTP {e.code}: {e.reason}")
            members = []
        team_members[team_name] = members

        # Only keep members with positive karma (active contributors)
        active = [m for m in members if m["karma"] > 0]
        print(f"  Active (karma > 0): {len(active)} of {len(members)}")

    print(f"\n{'=' * 60}")
    print("Building _FALLBACK_CONTRIBUTORS array...")

    # Generate fallback source
    fallback_source = build_fallback_array(team_members, min_karma=0)

    # Update the file
    update_launchpad_client(fallback_source)

    print("\nDone! 🎉")


if __name__ == "__main__":
    main()
