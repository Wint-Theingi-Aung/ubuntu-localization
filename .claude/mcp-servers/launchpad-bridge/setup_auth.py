#!/usr/bin/env python3
"""
Launchpad Bridge — OAuth Setup
-------------------------------
Run this script once to authorize the Launchpad Bridge MCP server.

This will:
1. Open your browser to Launchpad
2. Ask you to log in and authorize "ubuntu-localization-tool"
3. Cache credentials securely for future use

After setup, the Launchpad Bridge MCP server can access your:
- Profile (display name, karma, wiki URL)
- Team memberships (Ubuntu Translators, language teams)
- Translation contributions and stats

Usage:
    source venv/bin/activate
    python .claude/mcp-servers/launchpad-bridge/setup_auth.py
"""

import sys
from pathlib import Path

CREDENTIALS_DIR = Path.home() / ".cache" / "launchpad-bridge"
CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
CREDENTIALS_FILE = CREDENTIALS_DIR / "credentials"

APP_NAME = "ubuntu-localization-tool"


def main():
    print("=" * 64)
    print("  Launchpad Bridge — OAuth Setup")
    print("=" * 64)
    print()
    print("This script will open your browser to authorize the")
    print("Ubuntu Localization Tool on Launchpad.")
    print()
    print(f"App name:  {APP_NAME}")
    print(f"Cache dir: {CREDENTIALS_DIR}")
    print()

    # Check for existing credentials
    if CREDENTIALS_FILE.exists():
        print("⚠  Existing credentials found.")
        response = input("Overwrite? [y/N]: ").strip().lower()
        if response != "y":
            print("Keeping existing credentials. Done.")
            return
        CREDENTIALS_FILE.unlink()
        print("Removed old credentials.")
        print()

    print("Opening browser for Launchpad authorization...")
    print("(If the browser doesn't open, complete auth manually)")
    print()

    try:
        from launchpadlib.launchpad import Launchpad

        print("1. A browser window will open.")
        print("2. Log in to Launchpad (create an account if needed).")
        print("3. Authorize 'ubuntu-localization-tool' for desktop access.")
        print("4. Close the browser tab after authorization.")
        print()

        lp = Launchpad.login_with(
            application_name=APP_NAME,
            service_root="production",
            launchpadlib_dir=str(CREDENTIALS_DIR),
            credentials_file=str(CREDENTIALS_FILE),
            version="devel",
        )

        me = lp.me
        print("✓ Authorization successful!")
        print(f"  Logged in as: {me.display_name} ({me.name})")
        print(f"  Karma: {me.karma}")
        print(f"  Profile: {me.web_link}")
        print()
        print(f"Credentials cached at: {CREDENTIALS_FILE}")
        print()
        print("The Launchpad Bridge MCP server is now ready to use.")

        # Show team memberships
        try:
            translation_teams = []
            for membership in me.memberships_details:
                team_name = str(membership.team.name)
                if "translat" in team_name.lower() or "ubuntu" in team_name.lower():
                    translation_teams.append(team_name)

            if translation_teams:
                print()
                print(f"Translation teams ({len(translation_teams)}):")
                for t in translation_teams:
                    print(f"  • {t}")
        except Exception:
            pass

    except ImportError:
        print("✗ launchpadlib not installed.")
        print("  Run: pip install launchpadlib")
        sys.exit(1)
    except KeyboardInterrupt:
        print()
        print("✗ Setup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print()
        print(f"✗ Setup failed: {e}")
        print()
        print("Troubleshooting:")
        print("  - Ensure you have an internet connection")
        print("  - Try again: python setup_auth.py")
        print("  - Launchpad API docs: https://help.launchpad.net/API")
        sys.exit(1)

    print()
    print("=" * 64)
    print("  Setup complete. You can now use Launchpad Bridge.")
    print("=" * 64)


if __name__ == "__main__":
    main()
