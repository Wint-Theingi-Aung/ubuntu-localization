"""Translate router — AI batch translation with QA verification."""

import json
from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse

from backend.config import config, LANGUAGES
from backend.services.translator import translate_batch, qa_verify_batch, check_available
from backend.services.session import create_session
from backend.services import db
from backend.templates_engine import templates

router = APIRouter(prefix="/translate", tags=["translate"])


@router.get("/", response_class=HTMLResponse)
async def translate_page(request: Request, session_id: str = ""):
    """Show the translation workspace."""
    session = create_session(session_id) if session_id else None
    parsed = session.load_parsed() if session else None
    report = session.load_report() if session else None
    translations = session.load_translations() if session else {}

    if not parsed:
        return templates.TemplateResponse(request, "translate.html", {"ai_available": check_available(),
            "no_session": True,
            "session_id": "",
            "language": "",
            "language_code": "",
            "entries": [],
            "total_untranslated": 0,
            "page": 1,
            "total_pages": 1})

    untranslated = parsed.get("untranslated", [])
    # Apply any existing translations
    for e in untranslated:
        key = str(e["index"])
        if key in translations:
            e["msgstr"] = translations[key]
            e["translated_inline"] = translations[key]

    # Pagination
    page = 1
    per_page = config.items_per_page
    total_pages = max(1, (len(untranslated) + per_page - 1) // per_page)
    start = (page - 1) * per_page
    end = min(start + per_page, len(untranslated))
    page_entries = untranslated[start:end]

    return templates.TemplateResponse(request, "translate.html", {"ai_available": check_available(),
        "no_session": False,
        "session_id": session.session_id,
        "language": parsed.get("detected_language", {}).get("name", "Unknown"),
        "language_code": parsed.get("language_code", "my"),
        "entries": page_entries,
        "total_untranslated": len(untranslated),
        "page": page,
        "total_pages": total_pages,
        "languages": LANGUAGES,
    })


@router.post("/batch", response_class=HTMLResponse)
async def translate_entries(
    request: Request,
    session_id: str = Form(...),
    target_lang: str = Form("my"),
):
    """Translate a batch of untranslated entries."""
    session = create_session(session_id)
    parsed = session.load_parsed()
    if not parsed:
        return HTMLResponse("<div class='error-banner'>No session data found. Upload a .po file first.</div>")

    lang_code = parsed.get("language_code", target_lang)
    lang_name = LANGUAGES.get(lang_code, {}).get("name", target_lang)

    untranslated = parsed.get("untranslated", [])
    existing = session.load_translations()

    # Filter to entries that haven't been translated yet
    targets = [e for e in untranslated if str(e["index"]) not in existing]
    if not targets:
        return HTMLResponse("""<div class="success-banner">
            <span class="banner-icon">✅</span>
            <span>All visible strings are already translated!</span>
        </div>""")

    batch = targets[:config.batch_size]
    msgids = [e["msgid"] for e in batch]

    # Translate
    try:
        results = translate_batch(msgids, lang_name, lang_code)
    except RuntimeError as e:
        return HTMLResponse(f"""<div class="error-banner">
            <span class="banner-icon">⚠️</span>
            <span>Translation failed: {e}</span>
        </div>""")

    # Save results
    for entry, translated in zip(batch, results):
        session.save_translation(entry["index"], translated)
        # Persist to database
        db.save_translation(
            session_key=session_id,
            entry_index=entry["index"],
            msgid=entry["msgid"],
            msgstr=translated,
            msgctxt=entry.get("msgctxt", ""),
        )

    # QA verify
    qa_entries = [{"index": e["index"], "msgid": e["msgid"], "translated": t}
                  for e, t in zip(batch, results)]
    qa_results = qa_verify_batch(qa_entries, lang_name)

    passed = sum(1 for r in qa_results if r["passed"])
    failed = len(qa_results) - passed

    # Render results
    items_html = ""
    for r in qa_results:
        status_icon = "✅" if r["passed"] else "⚠️"
        status_class = "qa-pass" if r["passed"] else "qa-fail"
        items_html += f"""
        <div class="translate-result {status_class}" id="entry-{r['index']}">
            <div class="result-status">{status_icon}</div>
            <div class="result-body">
                <div class="result-source">{r['msgid'][:120]}</div>
                <div class="result-target">{r['translated'][:120]}</div>
                <div class="result-checks">
                    {''.join(f'<span class="check-tag {"pass" if c["passed"] else "fail"}">{c["name"]}: {c["detail"]}</span>' for c in r['checks'])}
                </div>
            </div>
        </div>"""

    return HTMLResponse(f"""<div id="translate-results">
        <div class="batch-summary">
            <span class="batch-stat">📝 Translated: {len(results)}</span>
            <span class="batch-stat">✅ Passed: {passed}</span>
            <span class="batch-stat">{'⚠️ Flagged: ' + str(failed) if failed else '🎉 All clean!'}</span>
        </div>
        <div class="result-list">{items_html}</div>
    </div>""")


@router.get("/progress/{session_id}")
async def translate_progress(session_id: str):
    """Return JSON progress for htmx polling."""
    session = create_session(session_id)
    parsed = session.load_parsed()
    if not parsed:
        return JSONResponse({"error": "No session"}, status_code=404)

    translations = session.load_translations()
    total = parsed["metadata"]["untranslated"]
    done = len(translations)
    pct = round(done / total * 100, 1) if total > 0 else 100

    return JSONResponse({
        "total": total,
        "translated": done,
        "remaining": total - done,
        "completion_pct": pct,
    })


@router.post("/save", response_class=HTMLResponse)
async def save_translation(
    request: Request,
    session_id: str = Form(...),
    entry_index: int = Form(...),
    translated: str = Form(...),
):
    """Save a single manual translation via htmx."""
    session = create_session(session_id)
    session.save_translation(entry_index, translated)

    return HTMLResponse(f"""<span class="save-indicator saved" id="save-indicator-{entry_index}">
        ✓ Saved
    </span>""")
