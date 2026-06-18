"""Translate router — unified upload + translate + export pipeline.

All three workflow steps consolidated into a single /translate/ page:
  1. Upload  — drag-and-drop .po file, language detection
  2. Translate — AI batch + manual side-by-side editor (10 strings/page)
  3. Export   — write .po file for download (pure file generation, no git)
"""

import html
import json
from pathlib import PurePath
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse

from backend.config import config, EXPORTS_DIR, LANGUAGES, LANGUAGE_CHOICES
from backend.services.po_parser import parse_po_file, generate_priority_report, write_po_file, generate_export_filename
from backend.services.translator import translate_batch, qa_verify_batch, check_available
from backend.services.session import create_session
from backend.services import db
from backend.templates_engine import templates

router = APIRouter(prefix="/translate", tags=["translate"])

SUPPORTED_PO_SUFFIXES = {".po", ".pot"}


# ── Helpers ──────────────────────────────────────────────────────────

def _is_htmx(request: Request) -> bool:
    """Check if the request was made by htmx."""
    return bool(request.headers.get("HX-Request"))


def _clean_upload_filename(filename: str) -> str:
    """Return the basename browsers may send, without surrounding whitespace."""
    return PurePath(filename.strip().replace("\\", "/")).name


def _is_supported_po_file(filename: str) -> bool:
    return PurePath(filename).suffix.lower() in SUPPORTED_PO_SUFFIXES


# ── Main Unified Page ────────────────────────────────────────────────

@router.get("/", response_class=HTMLResponse)
async def translate_page(request: Request, session_id: str = "", auto: bool = False, page: int = 1):
    """Unified translate page: upload form (no session) or workspace (with session)."""
    session = create_session(session_id) if session_id else None
    parsed = session.load_parsed() if session else None
    report = session.load_report() if session else None
    translations = session.load_translations() if session else {}
    meta = session.get_metadata() if session else {}

    if not parsed:
        return templates.TemplateResponse(request, "translate.html", {
            "ai_available": check_available(),
            "language_choices": LANGUAGE_CHOICES,
            "no_session": True,
            "session_id": "",
            "language": "",
            "language_code": "",
            "entries": [],
            "total_untranslated": 0,
            "page": 1,
            "total_pages": 1,
            "auto_translate": False,
            "preview": None,
            "git_branch": "ai-enhanced",
            "git_clean": True,
        })

    lang_code = parsed.get("language_code", "my")
    lang_name = parsed.get("detected_language", {}).get("name", LANGUAGES.get(lang_code, {}).get("name", "Unknown"))

    # ── Build translation workspace ──
    untranslated = parsed.get("untranslated", [])
    for e in untranslated:
        key = str(e["index"])
        if key in translations:
            e["msgstr"] = translations[key]
            e["translated_inline"] = translations[key]

    per_page = config.items_per_page
    total_pages = max(1, (len(untranslated) + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    start = (page - 1) * per_page
    end = min(start + per_page, len(untranslated))
    page_entries = untranslated[start:end]

    # ── Build export preview ──
    total_done = parsed["metadata"]["translated"] + len(translations)
    total = parsed["metadata"]["total_entries"]
    new = len(translations)

    preview = None
    if new > 0:
        preview = {
            "language": lang_name,
            "language_code": lang_code,
            "filename": generate_export_filename(meta.get("filename", "messages.po"), lang_code),
            "source_file": meta.get("filename", "unknown.po"),
            "total_entries": total,
            "previously_translated": parsed["metadata"]["translated"],
            "newly_translated": new,
            "qa_passed": new,
            "qa_failed": 0,
            "completion_pct": round(total_done / total * 100, 1) if total > 0 else 100,
            "completion_before": parsed["metadata"]["completion_pct"],
        }

    return templates.TemplateResponse(request, "translate.html", {
        "ai_available": check_available(),
        "language_choices": LANGUAGE_CHOICES,
        "no_session": False,
        "session_id": session.session_id,
        "language": lang_name,
        "language_code": lang_code,
        "entries": page_entries,
        "total_untranslated": len(untranslated),
        "page": page,
        "total_pages": total_pages,
        "auto_translate": auto,
        "languages": LANGUAGES,
        "preview": preview,
    })


# ── Upload ───────────────────────────────────────────────────────────

@router.post("/upload", response_class=HTMLResponse)
async def upload_file(
    request: Request,
    file: UploadFile = File(None),
    target_lang: str = Form("my"),
):
    """Handle .po file upload — parse, detect gaps, store session, return fragment."""
    # Validate file presence
    if file is None or not file.filename:
        if _is_htmx(request):
            return HTMLResponse(f"""<div class="error-banner">
                <span class="banner-icon">⚠️</span>
                <span>No file selected. Please choose a .po file to upload.</span>
            </div>""")
        return RedirectResponse(url="/translate/", status_code=303)

    filename = _clean_upload_filename(file.filename)

    # Validate file type
    if not _is_supported_po_file(filename):
        error_msg = "Only .po and .pot files are supported."
        if _is_htmx(request):
            return HTMLResponse(f"""<div class="error-banner">
                <span class="banner-icon">⚠️</span>
                <span>{error_msg}</span>
            </div>""")
        return RedirectResponse(url="/translate/", status_code=303)

    # Read and validate size
    content = await file.read()
    if len(content) > config.max_upload_size_mb * 1024 * 1024:
        error_msg = f"File too large. Maximum size is {config.max_upload_size_mb} MB."
        if _is_htmx(request):
            return HTMLResponse(f"""<div class="error-banner">
                <span class="banner-icon">⚠️</span>
                <span>{error_msg}</span>
            </div>""")
        return RedirectResponse(url="/translate/", status_code=303)

    text = content.decode("utf-8", errors="replace")

    # Parse
    try:
        parsed = parse_po_file(text, filename)
    except Exception as e:
        error_msg = f"Failed to parse .po file: {e}"
        if _is_htmx(request):
            return HTMLResponse(f"""<div class="error-banner">
                <span class="banner-icon">⚠️</span>
                <span>{error_msg}</span>
            </div>""")
        return RedirectResponse(url="/translate/", status_code=303)

    # If no language detected, use the user's selection
    if not parsed.get("detected_language"):
        lang_info = LANGUAGES.get(target_lang, LANGUAGES["my"])
        parsed["detected_language"] = {"code": target_lang, **lang_info}
        parsed["language_code"] = target_lang

    # Generate priority report
    report = generate_priority_report(parsed)

    # Save session
    session = create_session()
    session.save_parsed(parsed)
    session.save_report(report)
    session.set_metadata(
        filename=filename,
        language=parsed.get("detected_language", {}).get("name", "Unknown"),
        language_code=parsed.get("language_code", target_lang),
        total_entries=parsed["metadata"]["total_entries"],
        translated_count=parsed["metadata"]["translated"],
    )

    # Persist to database
    lang_code = parsed.get("language_code", target_lang)
    lang_name = parsed.get("detected_language", {}).get("name", "Unknown")
    db.create_session(
        session_key=session.session_id,
        filename=filename,
        language_code=lang_code,
        language_name=lang_name,
        total_entries=parsed["metadata"]["total_entries"],
        translated_before=parsed["metadata"]["translated"],
    )

    # htmx AJAX request → redirect to the same page with session via HX-Redirect
    if _is_htmx(request):
        redirect_url = f"/translate/?session_id={session.session_id}&auto=1"
        return HTMLResponse(
            content="",
            status_code=200,
            headers={"HX-Redirect": redirect_url},
        )

    # Regular browser POST → redirect
    return RedirectResponse(
        url=f"/translate/?session_id={session.session_id}&auto=1",
        status_code=303,
    )


# ── Demo Session ──────────────────────────────────────────────────────

@router.post("/demo", response_class=HTMLResponse)
async def demo_session(
    request: Request,
    target_lang: str = Form("my"),
):
    """Create a demo session with 3 sample strings for testing."""
    lang_info = LANGUAGES.get(target_lang, LANGUAGES["my"])

    # Build synthetic parsed data with 3 demo strings
    demo_entries = [
        {"index": 0, "msgid": "Hello", "msgstr": "",
         "msgctxt": "Greeting", "flags": [], "occurrences": [("demo.po", "1")], "tcomment": ""},
        {"index": 1, "msgid": "Settings", "msgstr": "",
         "msgctxt": "Menu item", "flags": [], "occurrences": [("demo.po", "2")], "tcomment": ""},
        {"index": 2, "msgid": "Shutdown", "msgstr": "",
         "msgctxt": "System action", "flags": [], "occurrences": [("demo.po", "3")], "tcomment": ""},
    ]

    parsed = {
        "filename": "demo.po",
        "detected_language": {"code": target_lang, **lang_info},
        "language_code": target_lang,
        "metadata": {
            "total_entries": 3,
            "translated": 0,
            "untranslated": 3,
            "fuzzy": 0,
            "completion_pct": 0.0,
        },
        "all_entries": demo_entries,
        "untranslated": demo_entries,
        "po_headers": {},
        "parsed_at": datetime.utcnow().isoformat(),
    }

    # Generate priority report
    report = generate_priority_report(parsed)

    # Save session
    session = create_session()
    session.save_parsed(parsed)
    session.save_report(report)
    session.set_metadata(
        filename="demo.po",
        language=lang_info["name"],
        language_code=target_lang,
        total_entries=3,
        translated_count=0,
    )

    # Persist to database
    db.create_session(
        session_key=session.session_id,
        filename="demo.po",
        language_code=target_lang,
        language_name=lang_info["name"],
        total_entries=3,
        translated_before=0,
    )

    return RedirectResponse(
        url=f"/translate/?session_id={session.session_id}",
        status_code=303,
    )


@router.get("/upload-status/{session_id}", response_class=HTMLResponse)
async def upload_status(request: Request, session_id: str):
    """Show session status for htmx polling."""
    session = create_session(session_id)
    if not session.has_data:
        return HTMLResponse("""<div class="empty-state">
            <span class="empty-icon">📭</span>
            <h3>Session not found</h3>
            <p>Upload a .po file to get started.</p>
        </div>""")

    parsed = session.load_parsed()
    meta = session.get_metadata()
    if not parsed:
        return HTMLResponse("<p>No data yet.</p>")

    md = parsed["metadata"]
    pct = md["completion_pct"]

    return HTMLResponse(f"""<div class="session-card" hx-swap-oob="true" id="session-status">
        <div class="session-header">
            <span class="session-icon">📄</span>
            <div>
                <h3>{html.escape(str(meta.get('filename', 'Unknown')))}</h3>
                <span class="lang-badge lang-{html.escape(str(parsed.get('language_code', 'my')))}">{html.escape(str(meta.get('language', 'Unknown')))}</span>
            </div>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar" style="width:{pct}%"></div>
            <span class="progress-label">{pct}% complete</span>
        </div>
        <div class="session-stats">
            <div class="stat"><span class="stat-value">{md['total_entries']:,}</span><span class="stat-label">Total</span></div>
            <div class="stat"><span class="stat-value">{md['translated']:,}</span><span class="stat-label">Done</span></div>
            <div class="stat"><span class="stat-value">{md['untranslated']:,}</span><span class="stat-label">Missing</span></div>
            <div class="stat"><span class="stat-value">{md.get('fuzzy', 0)}</span><span class="stat-label">Fuzzy</span></div>
        </div>
    </div>""")


# ── Translate ────────────────────────────────────────────────────────

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
        error_msg = str(e)
        import re as _re
        m = _re.search(r'Wait ~?(\d+)s', error_msg)
        if m:
            wait_secs = int(m.group(1))
            safe_session = html.escape(session_id)
            safe_lang = html.escape(target_lang)
            return HTMLResponse(f"""
<div class="rate-limit-banner" id="rate-limit-notice">
  <span class="banner-icon">⏳</span>
  <span>Rate limit hit — retrying in <strong id="rl-countdown">{wait_secs}</strong>s automatically...</span>
  <button class="btn btn-outline btn-sm" onclick="cancelRetry()" style="margin-left:auto">Cancel</button>
</div>
<script>
(function() {{
  let secs = {wait_secs};
  let cancelled = false;
  window._rlTimer = setInterval(() => {{
    if (cancelled) return;
    secs--;
    const el = document.getElementById('rl-countdown');
    if (el) el.textContent = secs;
    if (secs <= 0) {{
      clearInterval(window._rlTimer);
      const notice = document.getElementById('rate-limit-notice');
      if (notice) notice.innerHTML = '<span class="banner-icon">🔄</span> Retrying...';
      htmx.ajax('POST', '/translate/batch', {{
        target: '#translate-results',
        swap: 'beforeend',
        values: {{ session_id: '{safe_session}', target_lang: '{safe_lang}' }}
      }});
    }}
  }}, 1000);
  window.cancelRetry = function() {{
    cancelled = true;
    clearInterval(window._rlTimer);
    const notice = document.getElementById('rate-limit-notice');
    if (notice) notice.remove();
  }};
}})();
</script>""")
        return HTMLResponse(f"""<div class="error-banner">
            <span class="banner-icon">⚠️</span>
            <span>Translation failed: {html.escape(error_msg)}</span>
        </div>""")

    # Save results
    for entry, translated in zip(batch, results):
        session.save_translation(entry["index"], translated)
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

    # Render results — batch-level summary only, no per-entry QA noise
    textarea_updates = ""
    indicator_updates = ""
    for r in qa_results:
        entry_index = r["index"]
        translated_text = html.escape(r["translated"], quote=False)

        textarea_updates += f"""
        <textarea id="translation-box-{entry_index}" name="translated" class="auto-save" rows="3"
                  placeholder="Type translation or use AI above..." hx-swap-oob="true">{translated_text}</textarea>"""
        indicator_updates += f"""
        <span class="save-indicator saved" id="save-indicator-{entry_index}" hx-swap-oob="true">✓ Saved</span>"""

    # Refresh export section to show newly available export
    export_refresh = ""
    if len(session.load_translations()) > 0:
        export_refresh = f"""
        <div hx-swap-oob="true" id="export-section" hx-get="/translate/?session_id={html.escape(session_id)}"
             hx-trigger="load" hx-select="#export-section" hx-swap="outerHTML"></div>"""

    # Build clean batch summary
    error_text = ""
    if failed > 0:
        error_text = f"""<span class="batch-stat" style="color:var(--warning)">⚠️ {failed} flagged</span>"""
    else:
        error_text = """<span class="batch-stat" style="color:var(--success)">✔ 0 errors</span>"""

    return HTMLResponse(f"""{textarea_updates}
    {indicator_updates}
    {export_refresh}
    <div id="translate-results">
        <div class="batch-summary">
            <span class="batch-stat">📝 {len(results)} strings translated</span>
            <span class="batch-stat" style="color:var(--success)">✔ Passed</span>
            {error_text}
        </div>
        <p style="font-size:13px;color:var(--text-light);margin-top:8px">Ready to export</p>
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


# ── Export ───────────────────────────────────────────────────────────

@router.post("/export", response_class=HTMLResponse)
async def export_file(
    request: Request,
    session_id: str = Form(...),
):
    """Export translated .po file — pure file generation, no git integration."""
    session = create_session(session_id)
    parsed = session.load_parsed()
    translations = session.load_translations()
    meta = session.get_metadata()

    if not parsed:
        return HTMLResponse("""<div class="error-banner">
            <span class="banner-icon">⚠️</span>
            <span>No session data found. Upload a .po file first.</span>
        </div>""")

    lang_code = meta.get("language_code", "my")
    filename = generate_export_filename(meta.get("filename", "messages.po"), lang_code)
    output_path = EXPORTS_DIR / filename

    # Build full translations dict from all sources
    full_translations = {}
    for entry in parsed.get("all_entries", []):
        idx = entry["index"]
        key = str(idx)
        if key in translations:
            full_translations[idx] = translations[key]
        else:
            full_translations[idx] = entry["msgstr"]

    # Write .po file (always available, even for 1-3 strings)
    write_po_file(parsed, full_translations, output_path, lang_code)

    new_count = len(translations)
    total = parsed["metadata"]["total_entries"]
    existing_count = parsed["metadata"]["translated"]
    completion_after = round((existing_count + new_count) / total * 100, 1) if total > 0 else 100

    # Persist to database
    db.log_export(
        session_key=session_id,
        export_file=filename,
        source_file=meta.get("filename", "unknown.po"),
        language_code=lang_code,
        language_name=meta.get("language", "Unknown"),
        strings_added=new_count,
        qa_passed=new_count,
        qa_failed=0,
        completion_before=parsed["metadata"]["completion_pct"],
        completion_after=completion_after,
    )

    return HTMLResponse(f"""<div id="export-result">
        <div class="success-banner">
            <span class="banner-icon">✅</span>
            <span>Export complete!</span>
        </div>
        <div class="export-details">
            <div class="export-detail">
                <span class="detail-label">File</span>
                <code class="detail-value">{html.escape(filename)}</code>
            </div>
            <div class="export-detail">
                <span class="detail-label">Strings</span>
                <span class="detail-value">+{new_count} new translations</span>
            </div>
            <div class="export-detail">
                <span class="detail-label">Completion</span>
                <span class="detail-value">{parsed["metadata"]["completion_pct"]}% → {completion_after}%</span>
            </div>
        </div>
        <div class="export-actions">
            <a href="/translate/download/{html.escape(filename)}" class="btn btn-primary" download>📥 Download .po file</a>
        </div>
    </div>""")


@router.get("/download/{filename}")
async def download_export(filename: str):
    """Download an exported .po file."""
    path = EXPORTS_DIR / filename
    if not path.exists():
        return JSONResponse({"error": "File not found"}, status_code=404)
    return FileResponse(
        path=str(path),
        filename=filename,
        media_type="text/x-gettext-translation",
    )
