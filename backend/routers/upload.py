"""Upload router — .po file upload, parse, detect untranslated strings."""

from pathlib import PurePath

from fastapi import APIRouter, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from backend.config import config, LANGUAGE_CHOICES
from backend.services.po_parser import parse_po_file, generate_priority_report
from backend.services.session import create_session
from backend.services import db
from backend.templates_engine import templates

router = APIRouter(prefix="/upload", tags=["upload"])

SUPPORTED_PO_SUFFIXES = {".po", ".pot"}


def _is_htmx(request: Request) -> bool:
    """Check if the request was made by htmx."""
    return bool(request.headers.get("HX-Request"))


def _error_response(request: Request, error_msg: str):
    """Return an error: fragment for htmx, full page for non-htmx."""
    if _is_htmx(request):
        return templates.TemplateResponse(request, "upload_error.html", {
            "error": error_msg,
        })
    return templates.TemplateResponse(request, "upload.html", {
        "language_choices": LANGUAGE_CHOICES,
        "error": error_msg,
    })


def _clean_upload_filename(filename: str) -> str:
    """Return the basename browsers may send, without surrounding whitespace."""
    return PurePath(filename.strip().replace("\\", "/")).name


def _is_supported_po_file(filename: str) -> bool:
    return PurePath(filename).suffix.lower() in SUPPORTED_PO_SUFFIXES


@router.get("/", response_class=HTMLResponse)
async def upload_page(request: Request):
    """Show the upload form page. If session_id is provided, show results too."""
    session_id = request.query_params.get("session_id", "")
    result_data = None
    error = request.query_params.get("error", "")

    if session_id:
        session = create_session(session_id)
        if session.has_data:
            parsed = session.load_parsed()
            report = session.load_report()
            if parsed and report:
                result_data = {
                    "session_id": session_id,
                    "parsed": parsed,
                    "report": report,
                    "empty": len(parsed.get("untranslated", [])) == 0,
                    "all_translated": parsed["metadata"]["untranslated"] == 0,
                }

    return templates.TemplateResponse(request, "upload.html", {
        "language_choices": LANGUAGE_CHOICES,
        "result_data": result_data,
        "error": error,
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
        return _error_response(request, "No file selected. Please choose a .po file to upload.")

    filename = _clean_upload_filename(file.filename)

    # Validate file type
    if not _is_supported_po_file(filename):
        return _error_response(request, "Only .po and .pot files are supported. Please upload a GNU gettext file.")

    # Read and validate size
    content = await file.read()
    if len(content) > config.max_upload_size_mb * 1024 * 1024:
        return _error_response(request, f"File too large. Maximum size is {config.max_upload_size_mb} MB.")

    text = content.decode("utf-8", errors="replace")

    # Parse
    try:
        parsed = parse_po_file(text, filename)
    except Exception as e:
        return _error_response(request, f"Failed to parse .po file: {e}")

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

    result_ctx = {
        "session_id": session.session_id,
        "parsed": parsed,
        "report": report,
        "empty": len(parsed.get("untranslated", [])) == 0,
        "all_translated": parsed["metadata"]["untranslated"] == 0,
    }

    # htmx AJAX request → return fragment to inject into #upload-result
    if _is_htmx(request):
        return templates.TemplateResponse(request, "upload_result.html", result_ctx)

    # Regular browser POST → redirect to GET so the user sees the full formatted page
    return RedirectResponse(
        url=f"/translate/?session_id={session.session_id}&auto=1",
        status_code=303,
    )


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
