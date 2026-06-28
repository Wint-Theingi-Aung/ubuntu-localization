#!/usr/bin/env python3
"""
Launchpad OAuth Setup — for the Ubuntu Localization Tool

Run this once to authorize the backend to read your Launchpad profile,
team memberships, and the ubuntu-translators member list.

Usage:
    uv run python -m backend.auth_setup

This will:
1. Open your browser to Launchpad
2. Ask you to log in and authorize "ubuntu-localization-tool"
3. Cache the OAuth token at ~/.cache/launchpad-bridge/credentials

After setup, the Contributors page will use live Launchpad data instead of
the hardcoded fallback list. No personal/private data is ever stored — your
token is only used on your machine.
"""

import sys
from pathlib import Path

CREDENTIALS_DIR = Path.home() / ".cache" / "launchpad-bridge"
CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
CREDENTIALS_FILE = CREDENTIALS_DIR / "credentials"

APP_NAME = "ubuntu-localization-tool"


def main():
    print("=" * 64)
    print("  Ubuntu Localization Tool — Launchpad Authentication")
    print("=" * 64)
    print()
    print("This script opens your browser so you can authorize this")
    print("tool to read your Launchpad profile, team memberships,")
    print("and the ubuntu-translators contributor list.")
    print()
    print(f"App name:  {APP_NAME}")
    print(f"Token file: {CREDENTIALS_FILE}")
    print()

    # ── Check for existing credentials ──
    if CREDENTIALS_FILE.exists():
        print("Existing credentials found.")
        resp = input("Overwrite? [y/N]: ").strip().lower()
        if resp != "y":
            print("Keeping existing credentials. Done.")
            return
        CREDENTIALS_FILE.unlink()
        print("Removed old credentials.")
        print()

    # ── Authenticate ──
    from backend.services.launchpad_client import (
        CREDENTIALS_DIR as _cd,
        CREDENTIALS_FILE as _cf,
    )
    # Sanity check — the module uses the same paths
    assert str(_cd) == str(CREDENTIALS_DIR)
    assert str(_cf) == str(CREDENTIALS_FILE)

    print("Opening browser for Launchpad authorization...")
    print("(If the browser doesn't open, complete auth manually.)")
    print()
    print("  1. A browser window will open.")
    print("  2. Log in to Launchpad (create an account if needed).")
    print("  3. Authorize 'ubuntu-localization-tool' for desktop access.")
    print("  4. Close the browser tab after authorization.")
    print()

    try:
        from launchpadlib.launchpad import Launchpad

        lp = Launchpad.login_with(
            application_name=APP_NAME,
            service_root="production",
            launchpadlib_dir=str(CREDENTIALS_DIR),
            credentials_file=str(CREDENTIALS_FILE),
            version="devel",
        )

        me = lp.me
        print("Authorization successful!")
        print(f"  Logged in as: {me.display_name} ({me.name})")
        print(f"  Karma:        {getattr(me, 'karma', 'N/A')}")
        print(f"  Profile:      {me.web_link}")
        print()
        print(f"Token cached at: {CREDENTIALS_FILE}")
        print()
        print("The Contributors page will now use live Launchpad data.")
        print("Restart the server if it's running.")

        # Show translation teams
        try:
            teams = []
            for m in me.memberships_details:
                tn = str(m.team.name)
                if "translat" in tn.lower() or "ubuntu" in tn.lower():
                    teams.append(tn)
            if teams:
                print()
                print(f"Translation teams ({len(teams)}):")
                for t in sorted(teams):
                    print(f"  - {t}")
        except Exception:
            pass

    except ImportError:
        print("launchpadlib is not installed.")
        print("  Run: pip install launchpadlib")
        sys.exit(1)
    except KeyboardInterrupt:
        print()
        print("Setup cancelled.")
        sys.exit(1)
    except Exception as e:
        print()
        print(f"Setup failed: {e}")
        print()
        print("Troubleshooting:")
        print("  - Make sure you have an internet connection")
        print("  - Try again: uv run python -m backend.auth_setup")
        print("  - Launchpad API docs: https://help.launchpad.net/API")
        sys.exit(1)

    print()
    print("=" * 64)
    print("  Setup complete.")
    print("=" * 64)


if __name__ == "__main__":
    main()
