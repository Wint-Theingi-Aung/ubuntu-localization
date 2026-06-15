"""Server-side session management for translation state."""

import json
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from backend.config import SESSION_DIR


class TranslationSession:
    """Manages state for a translation session: parsed .po, translations, progress."""

    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id or uuid.uuid4().hex[:12]
        self._dir = SESSION_DIR / self.session_id
        self._dir.mkdir(parents=True, exist_ok=True)

    # ── Paths ───────────────────────────────────────────────────────

    @property
    def parsed_path(self) -> Path:
        return self._dir / "parsed.json"

    @property
    def report_path(self) -> Path:
        return self._dir / "report.json"

    @property
    def translations_path(self) -> Path:
        return self._dir / "translations.json"

    @property
    def metadata_path(self) -> Path:
        return self._dir / "session_meta.json"

    # ── Load / Save ─────────────────────────────────────────────────

    def load_parsed(self) -> Optional[dict]:
        """Load parsed .po data."""
        return self._load_json(self.parsed_path)

    def save_parsed(self, data: dict) -> None:
        self._save_json(self.parsed_path, data)

    def load_report(self) -> Optional[dict]:
        """Load detection report."""
        return self._load_json(self.report_path)

    def save_report(self, data: dict) -> None:
        self._save_json(self.report_path, data)

    def load_translations(self) -> dict:
        """Load saved translations (index → translated string)."""
        return self._load_json(self.translations_path) or {}

    def save_translations(self, data: dict) -> None:
        self._save_json(self.translations_path, data)

    def save_translation(self, index: int, translated: str) -> None:
        """Save a single translation."""
        trans = self.load_translations()
        trans[str(index)] = translated
        self.save_translations(trans)

    def get_metadata(self) -> dict:
        """Get session metadata."""
        meta = self._load_json(self.metadata_path) or {}
        return {
            "session_id": self.session_id,
            "created_at": meta.get("created_at", ""),
            "updated_at": meta.get("updated_at", ""),
            "filename": meta.get("filename", ""),
            "language": meta.get("language", ""),
            "language_code": meta.get("language_code", ""),
            "total_entries": meta.get("total_entries", 0),
            "translated_count": meta.get("translated_count", 0),
        }

    def set_metadata(self, **kwargs) -> None:
        meta = self._load_json(self.metadata_path) or {}
        meta["updated_at"] = datetime.utcnow().isoformat()
        if "created_at" not in meta:
            meta["created_at"] = meta["updated_at"]
        meta.update(kwargs)
        self._save_json(self.metadata_path, meta)

    # ── Helpers ─────────────────────────────────────────────────────

    def _load_json(self, path: Path) -> Optional[dict]:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return None
        return None

    def _save_json(self, path: Path, data: dict) -> None:
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2, default=str),
            encoding="utf-8",
        )

    def clear(self) -> None:
        """Remove all session files."""
        for f in self._dir.glob("*.json"):
            f.unlink()
        self._dir.rmdir()

    @property
    def has_data(self) -> bool:
        return self.parsed_path.exists()


# ── Session factory ────────────────────────────────────────────────────

def create_session(session_id: Optional[str] = None) -> TranslationSession:
    """Create or resume a translation session."""
    if session_id and (SESSION_DIR / session_id).exists():
        return TranslationSession(session_id)
    return TranslationSession(session_id)


def list_recent_sessions(limit: int = 10) -> list[dict]:
    """List recent translation sessions with metadata."""
    sessions = []
    for d in sorted(SESSION_DIR.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True):
        if d.is_dir():
            meta_path = d / "session_meta.json"
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text(encoding="utf-8"))
                    sessions.append({
                        "session_id": d.name,
                        **meta,
                    })
                except Exception:
                    pass
            if len(sessions) >= limit:
                break
    return sessions
