"""Application configuration loaded from environment and .env file."""

import os
from pathlib import Path
from dataclasses import dataclass, field
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── Language definitions ──────────────────────────────────────────────

LANGUAGES = {
    "my":  {"name": "Burmese",     "native": "မြန်မာဘာသာ",    "script": "Myanmar Unicode", "word_order": "SOV"},
    "shn": {"name": "Shan",        "native": "ၽႃႇသႃႇတႆး",     "script": "Shan Unicode",    "word_order": "SVO"},
    "mnw": {"name": "Mon",         "native": "ဘာသာမန်",       "script": "Mon Unicode",      "word_order": "SVO"},
    "ksw": {"name": "S'gaw Karen", "native": "ကညီကျိာ်",      "script": "S'gaw Karen Unicode", "word_order": "SVO"},
}

LANGUAGE_CHOICES = [(code, f"{info['name']} ({info['native']})") for code, info in LANGUAGES.items()]

# ── Paths ─────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
EXPORTS_DIR = PROJECT_ROOT / "exports"
SESSION_DIR = Path.home() / ".cache" / "ubuntu-localization" / "sessions"
UPLOAD_DIR = Path.home() / ".cache" / "ubuntu-localization" / "uploads"

for d in [DATA_DIR, EXPORTS_DIR, SESSION_DIR, UPLOAD_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ── Configuration ─────────────────────────────────────────────────────

@dataclass
class Config:
    """Application configuration."""
    google_api_key: str = field(default_factory=lambda: os.getenv("GOOGLE_API_KEY", ""))
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    gemini_temperature: float = 0.2
    batch_size: int = 15
    items_per_page: int = 10
    max_upload_size_mb: int = 50
    debug: bool = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")
    secret_key: str = field(default_factory=lambda: os.getenv(
        "SECRET_KEY", os.urandom(32).hex()
    ))

    @property
    def is_ai_available(self) -> bool:
        return bool(self.google_api_key)


config = Config()
