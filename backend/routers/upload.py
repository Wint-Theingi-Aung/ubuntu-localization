"""Upload router — .po file upload, parse, detect untranslated strings."""

from fastapi import APIRouter, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse

from backend.config import config, LANGUAGE_CHOICES
from backend.services.po_parser import parse_po_file, generate_priority_report
from backend.services.session import create_session
from backend.services import db
from backend.templates_engine import templates

router = APIRouter(prefix="/upload", tags=["upload"])


@router.get("/", response_class=HTMLResponse)
async def upload_page(request: Request):
    """Show the upload form page."""
    return templates.TemplateResponse(request, "upload.html", {
        "language_choices": LANGUAGE_CHOICES,
    })


@router.post("/", response_class=HTMLResponse)
async def upload_file(
    request: Request,
    file: UploadFile = File(None),
    target_lang: str = Form("my"),
):
    """Handle .po file upload — parse, detect gaps, return results."""
    # Validate file presence
    if file is None or not file.filename:
        return templates.TemplateResponse(request, "upload_error.html", {
            "error": "No file selected. Please choose a .po file to upload.",
        })

    # Validate file type
    if not file.filename.endswith(".po"):
        return templates.TemplateResponse(request, "upload_error.html", {
            "error": "Only .po files are supported. Please upload a GNU gettext .po file.",
        })

    # Read and validate size
    content = await file.read()
    if len(content) > config.max_upload_size_mb * 1024 * 1024:
        return templates.TemplateResponse(request, "upload_error.html", {
            "error": f"File too large. Maximum size is {config.max_upload_size_mb} MB.",
        })

    text = content.decode("utf-8", errors="replace")

    # Parse
    try:
        parsed = parse_po_file(text, file.filename)
    except Exception as e:
        return templates.TemplateResponse(request, "upload_error.html", {
            "error": f"Failed to parse .po file: {e}",
        })

    # If no language detected, use the user's selection
    if not parsed.get("detected_language"):
        from backend.config import LANGUAGES
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
        filename=file.filename,
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
        filename=file.filename,
        language_code=lang_code,
        language_name=lang_name,
        total_entries=parsed["metadata"]["total_entries"],
        translated_before=parsed["metadata"]["translated"],
    )

    return templates.TemplateResponse(request, "upload_result.html", {"session_id": session.session_id,
        "parsed": parsed,
        "report": report,
        "empty": len(parsed.get("untranslated", [])) == 0,
        "all_translated": parsed["metadata"]["untranslated"] == 0})


@router.get("/status/{session_id}", response_class=HTMLResponse)
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
                <h3>{meta.get('filename', 'Unknown')}</h3>
                <span class="lang-badge lang-{parsed.get('language_code', 'my')}">{meta.get('language', 'Unknown')}</span>
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
