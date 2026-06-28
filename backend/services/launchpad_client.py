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
    {
        "username": "wint-theingi-aung",
        "display_name": "Wint Theingi Aung",
        "karma": 282243,
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
            }
        ],
    },
    {
        "username": "rockrock2222222",
        "display_name": "Rockworld",
        "karma": 11448,
        "web_link": "https://launchpad.net/~rockrock2222222",
        "languages": ["my", "shn"],
        "language_codes": ["my", "shn"],
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
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            }
        ],
    },
    {
        "username": "clementlefebvre",
        "display_name": "Clement Lefebvre",
        "karma": 4558,
        "web_link": "https://launchpad.net/~clementlefebvre",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "linuxmint-translation-team-ksw",
                "display_name": "S'gaw Karen Translation Team for Linux Mint",
                "status": "Approved",
                "web_link": "https://launchpad.net/~linuxmint-translation-team-ksw",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            }
        ],
    },
    {
        "username": "trh",
        "display_name": "Thura",
        "karma": 172,
        "web_link": "https://launchpad.net/~trh",
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
            }
        ],
    },
    {
        "username": "gipsyhnh",
        "display_name": "Pyae Sone",
        "karma": 86,
        "web_link": "https://launchpad.net/~gipsyhnh",
        "languages": ["my", "shn"],
        "language_codes": ["my", "shn"],
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
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            }
        ],
    },
    {
        "username": "htetminaung2018",
        "display_name": "Tao Mon Lae",
        "karma": 86,
        "web_link": "https://launchpad.net/~htetminaung2018",
        "languages": ["mnw", "my"],
        "language_codes": ["mnw", "my"],
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
            {
                "team_name": "ubuntu-l10n-mnw",
                "display_name": "Ubuntu Mon Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-mnw",
            }
        ],
    },
    {
        "username": "thohi",
        "display_name": "Ye Htut Win",
        "karma": 43,
        "web_link": "https://launchpad.net/~thohi",
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
            }
        ],
    },
    {
        "username": "paing-phyoe",
        "display_name": "Yuki Painglay",
        "karma": 43,
        "web_link": "https://launchpad.net/~paing-phyoe",
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
            }
        ],
    },
    {
        "username": "zyl65535",
        "display_name": "Zayar Lwin",
        "karma": 2,
        "web_link": "https://launchpad.net/~zyl65535",
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
            }
        ],
    },
    {
        "username": "kokoye2007",
        "display_name": "kokoye2007 \ue0ff",
        "karma": 1,
        "web_link": "https://launchpad.net/~kokoye2007",
        "languages": ["mnw", "my", "shn"],
        "language_codes": ["mnw", "my", "shn"],
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
            {
                "team_name": "ubuntu-l10n-mnw",
                "display_name": "Ubuntu Mon Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-mnw",
            },
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            }
        ],
    },
    {
        "username": "krer",
        "display_name": "Adob Tail",
        "karma": 0,
        "web_link": "https://launchpad.net/~krer",
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
            }
        ],
    },
    {
        "username": "g-crazydemon",
        "display_name": "AlphaCool",
        "karma": 0,
        "web_link": "https://launchpad.net/~g-crazydemon",
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
            }
        ],
    },
    {
        "username": "anandrajny",
        "display_name": "Anand Raj",
        "karma": 0,
        "web_link": "https://launchpad.net/~anandrajny",
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
            }
        ],
    },
    {
        "username": "anontamon",
        "display_name": "anontamon",
        "karma": 0,
        "web_link": "https://launchpad.net/~anontamon",
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
            }
        ],
    },
    {
        "username": "4htet",
        "display_name": "ANyarThar",
        "karma": 0,
        "web_link": "https://launchpad.net/~4htet",
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
            }
        ],
    },
    {
        "username": "auenai",
        "display_name": "auenai",
        "karma": 0,
        "web_link": "https://launchpad.net/~auenai",
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
            }
        ],
    },
    {
        "username": "aungkokomyintoo",
        "display_name": "Aung Ko Ko Myint Oo",
        "karma": 0,
        "web_link": "https://launchpad.net/~aungkokomyintoo",
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
            }
        ],
    },
    {
        "username": "aungmyokyaw",
        "display_name": "Aung Myo Kyaw",
        "karma": 0,
        "web_link": "https://launchpad.net/~aungmyokyaw",
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
            }
        ],
    },
    {
        "username": "21whitefriend",
        "display_name": "Aung Myo Naing",
        "karma": 0,
        "web_link": "https://launchpad.net/~21whitefriend",
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
            }
        ],
    },
    {
        "username": "aungswan",
        "display_name": "Aung Swan",
        "karma": 0,
        "web_link": "https://launchpad.net/~aungswan",
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
            }
        ],
    },
    {
        "username": "aungkhantbo",
        "display_name": "AungKhantBo",
        "karma": 0,
        "web_link": "https://launchpad.net/~aungkhantbo",
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
            }
        ],
    },
    {
        "username": "aungsitt",
        "display_name": "aungsitt",
        "karma": 0,
        "web_link": "https://launchpad.net/~aungsitt",
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
            }
        ],
    },
    {
        "username": "aungthetkhaing",
        "display_name": "AungThetKhaing",
        "karma": 0,
        "web_link": "https://launchpad.net/~aungthetkhaing",
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
            }
        ],
    },
    {
        "username": "aungzinnwp",
        "display_name": "aungzin",
        "karma": 0,
        "web_link": "https://launchpad.net/~aungzinnwp",
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
            }
        ],
    },
    {
        "username": "ayekyar80",
        "display_name": "Aye Kyar",
        "karma": 0,
        "web_link": "https://launchpad.net/~ayekyar80",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "linuxmint-translation-team-ksw",
                "display_name": "S'gaw Karen Translation Team for Linux Mint",
                "status": "Approved",
                "web_link": "https://launchpad.net/~linuxmint-translation-team-ksw",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            }
        ],
    },
    {
        "username": "mon601",
        "display_name": "banyarhongsar",
        "karma": 0,
        "web_link": "https://launchpad.net/~mon601",
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
            }
        ],
    },
    {
        "username": "battoe19",
        "display_name": "Battoe19",
        "karma": 0,
        "web_link": "https://launchpad.net/~battoe19",
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
            }
        ],
    },
    {
        "username": "box02",
        "display_name": "box02",
        "karma": 0,
        "web_link": "https://launchpad.net/~box02",
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
            }
        ],
    },
    {
        "username": "chanhtaw75",
        "display_name": "chanhtaw75",
        "karma": 0,
        "web_link": "https://launchpad.net/~chanhtaw75",
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
            }
        ],
    },
    {
        "username": "chenheting",
        "display_name": "Chenheting",
        "karma": 0,
        "web_link": "https://launchpad.net/~chenheting",
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
            }
        ],
    },
    {
        "username": "chipo-ngongoni",
        "display_name": "Chipo Nancy Ngongoni",
        "karma": 0,
        "web_link": "https://launchpad.net/~chipo-ngongoni",
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
            }
        ],
    },
    {
        "username": "saintjohn769",
        "display_name": "chitko",
        "karma": 0,
        "web_link": "https://launchpad.net/~saintjohn769",
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
            }
        ],
    },
    {
        "username": "chriskl",
        "display_name": "chriskl",
        "karma": 0,
        "web_link": "https://launchpad.net/~chriskl",
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
            }
        ],
    },
    {
        "username": "dhoongjhaan",
        "display_name": "Dho Ong Jhaan",
        "karma": 0,
        "web_link": "https://launchpad.net/~dhoongjhaan",
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
            }
        ],
    },
    {
        "username": "ethan-kurt",
        "display_name": "Ethan Kurt",
        "karma": 0,
        "web_link": "https://launchpad.net/~ethan-kurt",
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
            }
        ],
    },
    {
        "username": "goldninjar-sbt",
        "display_name": "Goldninjar",
        "karma": 0,
        "web_link": "https://launchpad.net/~goldninjar-sbt",
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
            }
        ],
    },
    {
        "username": "heinlu1986",
        "display_name": "Hein Lu",
        "karma": 0,
        "web_link": "https://launchpad.net/~heinlu1986",
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
            }
        ],
    },
    {
        "username": "heinhtet",
        "display_name": "Ho No",
        "karma": 0,
        "web_link": "https://launchpad.net/~heinhtet",
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
            }
        ],
    },
    {
        "username": "naing-htun28",
        "display_name": "Htun Htun Naing",
        "karma": 0,
        "web_link": "https://launchpad.net/~naing-htun28",
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
            }
        ],
    },
    {
        "username": "htwelay",
        "display_name": "Htwe Lay",
        "karma": 0,
        "web_link": "https://launchpad.net/~htwelay",
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
            }
        ],
    },
    {
        "username": "jaejyae",
        "display_name": "Jae Jyae",
        "karma": 0,
        "web_link": "https://launchpad.net/~jaejyae",
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
            }
        ],
    },
    {
        "username": "jennyaungaung",
        "display_name": "Jenny Aung",
        "karma": 0,
        "web_link": "https://launchpad.net/~jennyaungaung",
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
            }
        ],
    },
    {
        "username": "jiormajor",
        "display_name": "JohnMajor",
        "karma": 0,
        "web_link": "https://launchpad.net/~jiormajor",
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
            }
        ],
    },
    {
        "username": "joinai77",
        "display_name": "Joinai",
        "karma": 0,
        "web_link": "https://launchpad.net/~joinai77",
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
            }
        ],
    },
    {
        "username": "jotamoi",
        "display_name": "Jotamoi",
        "karma": 0,
        "web_link": "https://launchpad.net/~jotamoi",
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
            }
        ],
    },
    {
        "username": "jumoun",
        "display_name": "jumoun",
        "karma": 0,
        "web_link": "https://launchpad.net/~jumoun",
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
            }
        ],
    },
    {
        "username": "kadiparaungmyohan",
        "display_name": "Kadipar Ag Myo Han",
        "karma": 0,
        "web_link": "https://launchpad.net/~kadiparaungmyohan",
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
            }
        ],
    },
    {
        "username": "geogrian1",
        "display_name": "kaung htet aung",
        "karma": 0,
        "web_link": "https://launchpad.net/~geogrian1",
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
            }
        ],
    },
    {
        "username": "kogyikaunghtet",
        "display_name": "Kaung Htet Htun",
        "karma": 0,
        "web_link": "https://launchpad.net/~kogyikaunghtet",
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
            }
        ],
    },
    {
        "username": "khinewin",
        "display_name": "KhineWin",
        "karma": 0,
        "web_link": "https://launchpad.net/~khinewin",
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
            }
        ],
    },
    {
        "username": "kozawhtet",
        "display_name": "Ko Zaw Htet",
        "karma": 0,
        "web_link": "https://launchpad.net/~kozawhtet",
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
            }
        ],
    },
    {
        "username": "royallyre7",
        "display_name": "koaung",
        "karma": 0,
        "web_link": "https://launchpad.net/~royallyre7",
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
            }
        ],
    },
    {
        "username": "kokhy-ygn",
        "display_name": "kokhy",
        "karma": 0,
        "web_link": "https://launchpad.net/~kokhy-ygn",
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
            }
        ],
    },
    {
        "username": "kyawkhine1992",
        "display_name": "Kyaw Khine",
        "karma": 0,
        "web_link": "https://launchpad.net/~kyawkhine1992",
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
            }
        ],
    },
    {
        "username": "kyawsanoo",
        "display_name": "Kyaw san oo",
        "karma": 0,
        "web_link": "https://launchpad.net/~kyawsanoo",
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
            }
        ],
    },
    {
        "username": "kyawhtetwinjr",
        "display_name": "Kyaw Thet Win",
        "karma": 0,
        "web_link": "https://launchpad.net/~kyawhtetwinjr",
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
            }
        ],
    },
    {
        "username": "hein7",
        "display_name": "kyaw zin",
        "karma": 0,
        "web_link": "https://launchpad.net/~hein7",
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
            }
        ],
    },
    {
        "username": "kyawmyatthu-ows",
        "display_name": "kyawmyatthu.ows",
        "karma": 0,
        "web_link": "https://launchpad.net/~kyawmyatthu-ows",
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
            }
        ],
    },
    {
        "username": "mryotesoe",
        "display_name": "KyawZayThu",
        "karma": 0,
        "web_link": "https://launchpad.net/~mryotesoe",
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
            }
        ],
    },
    {
        "username": "hansen-ross",
        "display_name": "Laywah",
        "karma": 0,
        "web_link": "https://launchpad.net/~hansen-ross",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "linuxmint-translation-team-ksw",
                "display_name": "S'gaw Karen Translation Team for Linux Mint",
                "status": "Approved",
                "web_link": "https://launchpad.net/~linuxmint-translation-team-ksw",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            }
        ],
    },
    {
        "username": "desefox",
        "display_name": "Lin",
        "karma": 0,
        "web_link": "https://launchpad.net/~desefox",
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
            }
        ],
    },
    {
        "username": "slayeroflion",
        "display_name": "Lionslayer",
        "karma": 0,
        "web_link": "https://launchpad.net/~slayeroflion",
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
            }
        ],
    },
    {
        "username": "littiger",
        "display_name": "Lit_Tiger",
        "karma": 0,
        "web_link": "https://launchpad.net/~littiger",
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
            }
        ],
    },
    {
        "username": "lotusblack",
        "display_name": "Lotus Black",
        "karma": 0,
        "web_link": "https://launchpad.net/~lotusblack",
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
            }
        ],
    },
    {
        "username": "lovetostrike",
        "display_name": "lovetostrike",
        "karma": 0,
        "web_link": "https://launchpad.net/~lovetostrike",
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
            }
        ],
    },
    {
        "username": "lusoe302",
        "display_name": "lusoe302",
        "karma": 0,
        "web_link": "https://launchpad.net/~lusoe302",
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
            }
        ],
    },
    {
        "username": "s.mark",
        "display_name": "Mark",
        "karma": 0,
        "web_link": "https://launchpad.net/~s.mark",
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
            }
        ],
    },
    {
        "username": "jaraiya",
        "display_name": "Maroah Chan",
        "karma": 0,
        "web_link": "https://launchpad.net/~jaraiya",
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
            }
        ],
    },
    {
        "username": "marigan",
        "display_name": "Matt Marigan",
        "karma": 0,
        "web_link": "https://launchpad.net/~marigan",
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
            }
        ],
    },
    {
        "username": "maungthuu",
        "display_name": "Maung Thuu",
        "karma": 0,
        "web_link": "https://launchpad.net/~maungthuu",
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
            }
        ],
    },
    {
        "username": "decembersnowlay15",
        "display_name": "May Thu Aung",
        "karma": 0,
        "web_link": "https://launchpad.net/~decembersnowlay15",
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
            }
        ],
    },
    {
        "username": "maythuaung512",
        "display_name": "May Thu Aung",
        "karma": 0,
        "web_link": "https://launchpad.net/~maythuaung512",
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
            }
        ],
    },
    {
        "username": "monbeeree",
        "display_name": "Mehm Rattna",
        "karma": 0,
        "web_link": "https://launchpad.net/~monbeeree",
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
            }
        ],
    },
    {
        "username": "oung",
        "display_name": "Mhem Aung Thu Win",
        "karma": 0,
        "web_link": "https://launchpad.net/~oung",
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
            }
        ],
    },
    {
        "username": "htawpone",
        "display_name": "Mi Htaw Pone",
        "karma": 0,
        "web_link": "https://launchpad.net/~htawpone",
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
            }
        ],
    },
    {
        "username": "khamoomhtawh",
        "display_name": "Mi Khamoom Htaw",
        "karma": 0,
        "web_link": "https://launchpad.net/~khamoomhtawh",
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
            }
        ],
    },
    {
        "username": "minhtaw",
        "display_name": "Min Htaw",
        "karma": 0,
        "web_link": "https://launchpad.net/~minhtaw",
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
            }
        ],
    },
    {
        "username": "kyitaw1",
        "display_name": "Min Mon",
        "karma": 0,
        "web_link": "https://launchpad.net/~kyitaw1",
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
            }
        ],
    },
    {
        "username": "technoyoungman",
        "display_name": "Min Thaw Tun",
        "karma": 0,
        "web_link": "https://launchpad.net/~technoyoungman",
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
            }
        ],
    },
    {
        "username": "minnkhant257",
        "display_name": "MinnHeinKhant",
        "karma": 0,
        "web_link": "https://launchpad.net/~minnkhant257",
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
            }
        ],
    },
    {
        "username": "mintun",
        "display_name": "mintun",
        "karma": 0,
        "web_link": "https://launchpad.net/~mintun",
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
            }
        ],
    },
    {
        "username": "myanmarmenn",
        "display_name": "mmmen",
        "karma": 0,
        "web_link": "https://launchpad.net/~myanmarmenn",
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
            }
        ],
    },
    {
        "username": "mohmohthanster",
        "display_name": "mmt",
        "karma": 0,
        "web_link": "https://launchpad.net/~mohmohthanster",
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
            }
        ],
    },
    {
        "username": "moelonepyaeshan",
        "display_name": "Moe Lone",
        "karma": 0,
        "web_link": "https://launchpad.net/~moelonepyaeshan",
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
            }
        ],
    },
    {
        "username": "monchanaie",
        "display_name": "Mon Chan Aie",
        "karma": 0,
        "web_link": "https://launchpad.net/~monchanaie",
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
            }
        ],
    },
    {
        "username": "mongipsy",
        "display_name": "Mongipsy",
        "karma": 0,
        "web_link": "https://launchpad.net/~mongipsy",
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
            }
        ],
    },
    {
        "username": "ahbao",
        "display_name": "Nai Ah Bao",
        "karma": 0,
        "web_link": "https://launchpad.net/~ahbao",
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
            }
        ],
    },
    {
        "username": "seiknyan",
        "display_name": "Nai Seik Nyan",
        "karma": 0,
        "web_link": "https://launchpad.net/~seiknyan",
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
            }
        ],
    },
    {
        "username": "naiseikrot",
        "display_name": "Nai Seik Rot",
        "karma": 0,
        "web_link": "https://launchpad.net/~naiseikrot",
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
            }
        ],
    },
    {
        "username": "naingaungphyo",
        "display_name": "Naing Aung Phyo",
        "karma": 0,
        "web_link": "https://launchpad.net/~naingaungphyo",
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
            }
        ],
    },
    {
        "username": "naingwinaung",
        "display_name": "naingwinaung",
        "karma": 0,
        "web_link": "https://launchpad.net/~naingwinaung",
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
            }
        ],
    },
    {
        "username": "naymyolay-gmail",
        "display_name": "nanda",
        "karma": 0,
        "web_link": "https://launchpad.net/~naymyolay-gmail",
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
            }
        ],
    },
    {
        "username": "naungy007",
        "display_name": "Naungy",
        "karma": 0,
        "web_link": "https://launchpad.net/~naungy007",
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
            }
        ],
    },
    {
        "username": "nlksg",
        "display_name": "Nay Lin Kyaw",
        "karma": 0,
        "web_link": "https://launchpad.net/~nlksg",
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
            }
        ],
    },
    {
        "username": "nonlawar",
        "display_name": "Non Lawar",
        "karma": 0,
        "web_link": "https://launchpad.net/~nonlawar",
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
            }
        ],
    },
    {
        "username": "nsumon",
        "display_name": "nsu mon",
        "karma": 0,
        "web_link": "https://launchpad.net/~nsumon",
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
            }
        ],
    },
    {
        "username": "nyanlintun2018",
        "display_name": "Nyan Lin Tun",
        "karma": 0,
        "web_link": "https://launchpad.net/~nyanlintun2018",
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
            }
        ],
    },
    {
        "username": "nyeinchan-job",
        "display_name": "Nyein Chan",
        "karma": 0,
        "web_link": "https://launchpad.net/~nyeinchan-job",
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
            }
        ],
    },
    {
        "username": "scorpionnyi",
        "display_name": "Nyi Nyi Htwe",
        "karma": 0,
        "web_link": "https://launchpad.net/~scorpionnyi",
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
            }
        ],
    },
    {
        "username": "nnnlcts-heart",
        "display_name": "Nyi Nyi Nyan Lin",
        "karma": 0,
        "web_link": "https://launchpad.net/~nnnlcts-heart",
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
            }
        ],
    },
    {
        "username": "nyinyinyanlin",
        "display_name": "Nyi Nyi Nyan Lin",
        "karma": 0,
        "web_link": "https://launchpad.net/~nyinyinyanlin",
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
            }
        ],
    },
    {
        "username": "www-nyinyisoewin-nnsw",
        "display_name": "Nyi Nyi Soe Win",
        "karma": 0,
        "web_link": "https://launchpad.net/~www-nyinyisoewin-nnsw",
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
            }
        ],
    },
    {
        "username": "pakaosorn",
        "display_name": "Pakao Sorn",
        "karma": 0,
        "web_link": "https://launchpad.net/~pakaosorn",
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
            }
        ],
    },
    {
        "username": "pakowsajinmon",
        "display_name": "Pakow Sajin Mon",
        "karma": 0,
        "web_link": "https://launchpad.net/~pakowsajinmon",
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
            }
        ],
    },
    {
        "username": "pmtpol77",
        "display_name": "Phone Myint Thein",
        "karma": 0,
        "web_link": "https://launchpad.net/~pmtpol77",
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
            }
        ],
    },
    {
        "username": "phoohtoo",
        "display_name": "Phoo Htoo",
        "karma": 0,
        "web_link": "https://launchpad.net/~phoohtoo",
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
            }
        ],
    },
    {
        "username": "phymng-ans",
        "display_name": "phymng.ans",
        "karma": 0,
        "web_link": "https://launchpad.net/~phymng-ans",
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
            }
        ],
    },
    {
        "username": "phyothuyahtet-punk",
        "display_name": "Phyo Thu Ya Htet",
        "karma": 0,
        "web_link": "https://launchpad.net/~phyothuyahtet-punk",
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
            }
        ],
    },
    {
        "username": "p-kyaws",
        "display_name": "Pkyaws",
        "karma": 0,
        "web_link": "https://launchpad.net/~p-kyaws",
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
            }
        ],
    },
    {
        "username": "plzaboutu",
        "display_name": "plzaboutu",
        "karma": 0,
        "web_link": "https://launchpad.net/~plzaboutu",
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
            }
        ],
    },
    {
        "username": "poundchein",
        "display_name": "poundchein",
        "karma": 0,
        "web_link": "https://launchpad.net/~poundchein",
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
            }
        ],
    },
    {
        "username": "pphyo20696",
        "display_name": "Pyae Phyo",
        "karma": 0,
        "web_link": "https://launchpad.net/~pphyo20696",
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
            }
        ],
    },
    {
        "username": "saiaungmurng-mw",
        "display_name": "Sai Aung Murng",
        "karma": 0,
        "web_link": "https://launchpad.net/~saiaungmurng-mw",
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
            }
        ],
    },
    {
        "username": "saimawnkham",
        "display_name": "Sai Mawn Kham",
        "karma": 0,
        "web_link": "https://launchpad.net/~saimawnkham",
        "languages": ["my", "shn"],
        "language_codes": ["my", "shn"],
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
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            }
        ],
    },
    {
        "username": "maraohnonpon",
        "display_name": "Saik Chan",
        "karma": 0,
        "web_link": "https://launchpad.net/~maraohnonpon",
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
            }
        ],
    },
    {
        "username": "saikosennin",
        "display_name": "Saiko",
        "karma": 0,
        "web_link": "https://launchpad.net/~saikosennin",
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
            }
        ],
    },
    {
        "username": "19panpha90",
        "display_name": "saisaepanpha",
        "karma": 0,
        "web_link": "https://launchpad.net/~19panpha90",
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
            }
        ],
    },
    {
        "username": "sayakyi",
        "display_name": "salai",
        "karma": 0,
        "web_link": "https://launchpad.net/~sayakyi",
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
            }
        ],
    },
    {
        "username": "jclovesme-zi9",
        "display_name": "Sargon Zi",
        "karma": 0,
        "web_link": "https://launchpad.net/~jclovesme-zi9",
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
            }
        ],
    },
    {
        "username": "saturngod",
        "display_name": "saturngod",
        "karma": 0,
        "web_link": "https://launchpad.net/~saturngod",
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
            }
        ],
    },
    {
        "username": "sawkhaing",
        "display_name": "Saw Khaing",
        "karma": 0,
        "web_link": "https://launchpad.net/~sawkhaing",
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
            }
        ],
    },
    {
        "username": "sorlok-reaves",
        "display_name": "Seth N. Hetu",
        "karma": 0,
        "web_link": "https://launchpad.net/~sorlok-reaves",
        "languages": ["my", "shn"],
        "language_codes": ["my", "shn"],
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
            {
                "team_name": "ubuntu-l10n-shn",
                "display_name": "Ubuntu Shan Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-l10n-shn",
            }
        ],
    },
    {
        "username": "sithu015",
        "display_name": "Sithu Aung",
        "karma": 0,
        "web_link": "https://launchpad.net/~sithu015",
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
            }
        ],
    },
    {
        "username": "sithu-a",
        "display_name": "Sithu Thwin",
        "karma": 0,
        "web_link": "https://launchpad.net/~sithu-a",
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
            }
        ],
    },
    {
        "username": "sopykt",
        "display_name": "soe paing",
        "karma": 0,
        "web_link": "https://launchpad.net/~sopykt",
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
            }
        ],
    },
    {
        "username": "soiroelyahmon",
        "display_name": "Soi Roe Lyah Mon",
        "karma": 0,
        "web_link": "https://launchpad.net/~soiroelyahmon",
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
            }
        ],
    },
    {
        "username": "liuzen",
        "display_name": "Stephen",
        "karma": 0,
        "web_link": "https://launchpad.net/~liuzen",
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
            }
        ],
    },
    {
        "username": "sukyihtwe1",
        "display_name": "sukyihtwe",
        "karma": 0,
        "web_link": "https://launchpad.net/~sukyihtwe1",
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
            }
        ],
    },
    {
        "username": "suriya-mon",
        "display_name": "Suriya Mon",
        "karma": 0,
        "web_link": "https://launchpad.net/~suriya-mon",
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
            }
        ],
    },
    {
        "username": "gladmanchikosha",
        "display_name": "takapiwanashe",
        "karma": 0,
        "web_link": "https://launchpad.net/~gladmanchikosha",
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
            }
        ],
    },
    {
        "username": "talachanmon",
        "display_name": "talachan",
        "karma": 0,
        "web_link": "https://launchpad.net/~talachanmon",
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
            }
        ],
    },
    {
        "username": "thaingarra",
        "display_name": "Thaingarra",
        "karma": 0,
        "web_link": "https://launchpad.net/~thaingarra",
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
            }
        ],
    },
    {
        "username": "thanhtikeag",
        "display_name": "Than Htike Aung",
        "karma": 0,
        "web_link": "https://launchpad.net/~thanhtikeag",
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
            }
        ],
    },
    {
        "username": "thanyawzinmin91",
        "display_name": "ThanyawZinmin",
        "karma": 0,
        "web_link": "https://launchpad.net/~thanyawzinmin91",
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
            }
        ],
    },
    {
        "username": "thapyaysan",
        "display_name": "thapyaysan",
        "karma": 0,
        "web_link": "https://launchpad.net/~thapyaysan",
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
            }
        ],
    },
    {
        "username": "tharnge1122",
        "display_name": "Thar Nge",
        "karma": 0,
        "web_link": "https://launchpad.net/~tharnge1122",
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
            }
        ],
    },
    {
        "username": "theinkha",
        "display_name": "Theinkha Mg Mg",
        "karma": 0,
        "web_link": "https://launchpad.net/~theinkha",
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
            }
        ],
    },
    {
        "username": "thelthel",
        "display_name": "Thel Thel",
        "karma": 0,
        "web_link": "https://launchpad.net/~thelthel",
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
            }
        ],
    },
    {
        "username": "thevowels",
        "display_name": "Thevowels",
        "karma": 0,
        "web_link": "https://launchpad.net/~thevowels",
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
            }
        ],
    },
    {
        "username": "thu99ball",
        "display_name": "Thu",
        "karma": 0,
        "web_link": "https://launchpad.net/~thu99ball",
        "languages": ["ksw"],
        "language_codes": ["ksw"],
        "teams": [
            {
                "team_name": "linuxmint-translation-team-ksw",
                "display_name": "S'gaw Karen Translation Team for Linux Mint",
                "status": "Approved",
                "web_link": "https://launchpad.net/~linuxmint-translation-team-ksw",
            },
            {
                "team_name": "ubuntu-translators",
                "display_name": "Ubuntu Translators",
                "status": "Approved",
                "web_link": "https://launchpad.net/~ubuntu-translators",
            }
        ],
    },
    {
        "username": "thurahlaing-pthgroup",
        "display_name": "Thura Hlaing",
        "karma": 0,
        "web_link": "https://launchpad.net/~thurahlaing-pthgroup",
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
            }
        ],
    },
    {
        "username": "kotinhtooaung",
        "display_name": "Tin Htoo Aung",
        "karma": 0,
        "web_link": "https://launchpad.net/~kotinhtooaung",
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
            }
        ],
    },
    {
        "username": "tmhtet",
        "display_name": "tmhtet",
        "karma": 0,
        "web_link": "https://launchpad.net/~tmhtet",
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
            }
        ],
    },
    {
        "username": "vskl",
        "display_name": "Victor San Kho Lin",
        "karma": 0,
        "web_link": "https://launchpad.net/~vskl",
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
            }
        ],
    },
    {
        "username": "waiphone9",
        "display_name": "Wai Phone Naing",
        "karma": 0,
        "web_link": "https://launchpad.net/~waiphone9",
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
            }
        ],
    },
    {
        "username": "man-shrek",
        "display_name": "wataruMan",
        "karma": 0,
        "web_link": "https://launchpad.net/~man-shrek",
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
            }
        ],
    },
    {
        "username": "mondser",
        "display_name": "WiRa",
        "karma": 0,
        "web_link": "https://launchpad.net/~mondser",
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
            }
        ],
    },
    {
        "username": "yanhmueaung",
        "display_name": "Yan Hmue Aung",
        "karma": 0,
        "web_link": "https://launchpad.net/~yanhmueaung",
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
            }
        ],
    },
    {
        "username": "yannainglin",
        "display_name": "Yan Naing Lin",
        "karma": 0,
        "web_link": "https://launchpad.net/~yannainglin",
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
            }
        ],
    },
    {
        "username": "eeeeyeeee",
        "display_name": "yan naung soe",
        "karma": 0,
        "web_link": "https://launchpad.net/~eeeeyeeee",
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
            }
        ],
    },
    {
        "username": "yanyansa",
        "display_name": "Yan Naung Soe Aye",
        "karma": 0,
        "web_link": "https://launchpad.net/~yanyansa",
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
            }
        ],
    },
    {
        "username": "yeluaung",
        "display_name": "YE LU AUNG",
        "karma": 0,
        "web_link": "https://launchpad.net/~yeluaung",
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
            }
        ],
    },
    {
        "username": "bravesai-mm",
        "display_name": "Ye Lwin Soe",
        "karma": 0,
        "web_link": "https://launchpad.net/~bravesai-mm",
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
            }
        ],
    },
    {
        "username": "yeminphyo25",
        "display_name": "Ye Min Phyo",
        "karma": 0,
        "web_link": "https://launchpad.net/~yeminphyo25",
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
            }
        ],
    },
    {
        "username": "yeaungthu",
        "display_name": "yeaungthu",
        "karma": 0,
        "web_link": "https://launchpad.net/~yeaungthu",
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
            }
        ],
    },
    {
        "username": "yethusoe",
        "display_name": "yethusoe",
        "karma": 0,
        "web_link": "https://launchpad.net/~yethusoe",
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
            }
        ],
    },
    {
        "username": "mhenyhazz177999000",
        "display_name": "Yhaza",
        "karma": 0,
        "web_link": "https://launchpad.net/~mhenyhazz177999000",
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
            }
        ],
    },
    {
        "username": "yinmayoo",
        "display_name": "YinMayOo (\u101a\u1009\u103a\u1019\u1031\u1026\u1038)",
        "karma": 0,
        "web_link": "https://launchpad.net/~yinmayoo",
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
            }
        ],
    },
    {
        "username": "hackforpeace01",
        "display_name": "Zaw Myo Htet",
        "karma": 0,
        "web_link": "https://launchpad.net/~hackforpeace01",
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
            }
        ],
    },
    {
        "username": "ayngzawlatt",
        "display_name": "zawlatt",
        "karma": 0,
        "web_link": "https://launchpad.net/~ayngzawlatt",
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
            }
        ],
    },
    {
        "username": "naymyohaen",
        "display_name": "\u1031\u1014\u1019\u103a\u102d\u1033\u1038\u101f\u1014\u1039",
        "karma": 0,
        "web_link": "https://launchpad.net/~naymyohaen",
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
            }
        ],
    }
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
