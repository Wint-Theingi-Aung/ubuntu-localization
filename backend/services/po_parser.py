"""PO file parsing service using polib."""

import io
import json
import polib
import tempfile
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

from backend.config import LANGUAGES


def parse_po_file(file_content: str, filename: str) -> dict:
    """Parse a .po file and extract all entries with metadata.

    Returns a structured dict with:
    - filename, language detection
    - metadata (total, translated, untranslated, fuzzy counts)
    - all entries with index, msgid, msgstr, msgctxt, flags, occurrences
    - untranslated subset (entries with empty msgstr)
    """
    # polib.pofile() requires a file path, not a string — write to a temp file
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".po", encoding="utf-8", delete=False
    ) as tmp:
        tmp.write(file_content)
        tmp_path = tmp.name

    try:
        po = polib.pofile(tmp_path)
    finally:
        os.unlink(tmp_path)

    total = len(po)
    translated = sum(1 for e in po if e.msgstr.strip() and "fuzzy" not in e.flags)
    untranslated = sum(1 for e in po if not e.msgstr.strip())
    fuzzy = sum(1 for e in po if "fuzzy" in e.flags)

    # Try to detect language from filename or metadata
    detected_lang = _detect_language(filename, po)

    # Build all entries
    all_entries = []
    untranslated_entries = []

    for i, entry in enumerate(po):
        entry_dict = {
            "index": i,
            "msgid": entry.msgid,
            "msgstr": entry.msgstr,
            "msgctxt": getattr(entry, "msgctxt", None) or None,
            "flags": list(entry.flags) if entry.flags else [],
            "occurrences": [(o[0], str(o[1])) for o in entry.occurrences] if entry.occurrences else [],
            "tcomment": getattr(entry, "tcomment", "") or "",
        }
        all_entries.append(entry_dict)

        if not entry.msgstr.strip():
            untranslated_entries.append(entry_dict)

    result = {
        "filename": filename,
        "detected_language": detected_lang,
        "language_code": detected_lang["code"] if detected_lang else None,
        "metadata": {
            "total_entries": total,
            "translated": translated,
            "untranslated": untranslated,
            "fuzzy": fuzzy,
            "completion_pct": round(translated / total * 100, 1) if total > 0 else 100.0,
        },
        "all_entries": all_entries,
        "untranslated": untranslated_entries,
        "po_headers": dict(po.metadata) if po.metadata else {},
        "parsed_at": datetime.utcnow().isoformat(),
    }

    return result


def classify_entry(entry: dict) -> str:
    """Classify a single entry by priority for translation ordering.

    Returns one of: p1_high_visibility, p2_system_context, p3_descriptive, p4_format
    """
    msgid = entry.get("msgid", "")

    # P1: High-visibility UI
    p1_keywords = [
        "File", "Edit", "View", "Help", "Settings", "Preferences",
        "Save", "Cancel", "OK", "Apply", "Close", "Open", "New",
        "Delete", "Copy", "Cut", "Paste", "Undo", "Redo", "Quit",
        "Exit", "Back", "Next", "Previous", "Finish", "Submit",
        "Yes", "No", "Enable", "Disable", "Install", "Remove",
    ]
    if any(kw.lower() == msgid.lower().strip("&_") for kw in p1_keywords):
        return "p1_high_visibility"

    # P2: System/OS context
    p2_keywords = [
        "Kernel", "Repository", "GNOME", "sudo", "Package",
        "Update", "Network", "Display", "Driver", "Disk",
        "Memory", "Processor", "Graphics", "Audio", "Printer",
        "Server", "Client", "Desktop", "Terminal", "Shell",
        "Boot", "GRUB", "Partition", "Encryption", "Firewall",
    ]
    if any(kw.lower() in msgid.lower() for kw in p2_keywords):
        return "p2_system_context"

    # P4: Short format strings / technical
    if len(msgid) < 20 and any(c in msgid for c in "%{}[]<>"):
        return "p4_format_strings"
    if len(msgid) < 10:
        return "p4_format_strings"

    # P3: Everything else — descriptive text
    return "p3_descriptive"


def generate_priority_report(parsed: dict) -> dict:
    """Generate a priority-classified detection report from parsed .po data."""
    untranslated = parsed.get("untranslated", [])
    by_priority = {
        "p1_high_visibility": {"count": 0, "entries": []},
        "p2_system_context": {"count": 0, "entries": []},
        "p3_descriptive": {"count": 0, "entries": []},
        "p4_format_strings": {"count": 0, "entries": []},
    }

    for entry in untranslated:
        priority = classify_entry(entry)
        by_priority[priority]["count"] += 1
        by_priority[priority]["entries"].append(entry)

    metadata = parsed.get("metadata", {})
    return {
        "filename": parsed.get("filename"),
        "detected_language": parsed.get("detected_language"),
        "language_code": parsed.get("language_code"),
        "summary": {
            "total": metadata.get("total_entries", 0),
            "translated": metadata.get("translated", 0),
            "untranslated": metadata.get("untranslated", 0),
            "fuzzy": metadata.get("fuzzy", 0),
            "completion_pct": metadata.get("completion_pct", 0),
        },
        "by_priority": by_priority,
        "fuzzy_entries": [e for e in parsed.get("all_entries", []) if "fuzzy" in e.get("flags", [])],
        "generated_at": datetime.utcnow().isoformat(),
    }


def write_po_file(parsed: dict, translations: dict, output_path: Path, lang_code: str) -> Path:
    """Apply translations to a parsed .po structure and write the output file.

    Args:
        parsed: The parsed .po data dict from parse_po_file()
        translations: Dict mapping entry index → translated string
        output_path: Where to write the output .po file
        lang_code: Language code for the PO file header

    Returns:
        Path to the written file
    """
    # Build a new .po file from the parsed data
    po = polib.POFile()
    po.metadata = parsed.get("po_headers", {})
    po.metadata["Language"] = lang_code
    po.metadata["Last-Translator"] = "Ubuntu Localization Tool (AI-Enhanced)"

    for entry in parsed.get("all_entries", []):
        idx = entry["index"]
        po_entry = polib.POEntry(
            msgid=entry["msgid"],
            msgstr=translations.get(idx, entry["msgstr"]),
            msgctxt=entry.get("msgctxt"),
            flags=entry.get("flags", []),
            occurrences=[(o[0], o[1]) for o in entry.get("occurrences", [])],
            tcomment=entry.get("tcomment", ""),
        )
        po.append(po_entry)

    po.save(str(output_path))
    return output_path


def generate_export_filename(base_filename: str, lang_code: str) -> str:
    """Generate a professional export filename with language tag and timestamp."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    base = Path(base_filename).stem
    lang_name = LANGUAGES.get(lang_code, {}).get("name", lang_code).lower().replace(" ", "_")
    return f"translated_{lang_code}_{lang_name}_{base}_{timestamp}.po"


def _detect_language(filename: str, po: polib.POFile) -> Optional[dict]:
    """Try to detect the target language from filename or PO headers."""
    # Check filename for language codes
    filename_lower = filename.lower()
    for code, info in LANGUAGES.items():
        name_lower = info["name"].lower()
        if code in filename_lower or name_lower in filename_lower:
            return {"code": code, **info}

    # Check PO metadata
    lang_header = po.metadata.get("Language", "") or po.metadata.get("Language-Team", "")
    for code, info in LANGUAGES.items():
        if code in lang_header.lower() or info["name"].lower() in lang_header.lower():
            return {"code": code, **info}

    return None
