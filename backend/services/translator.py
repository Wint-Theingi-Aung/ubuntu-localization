"""Translator service that wraps Google Gemini for Ubuntu .po translations."""

import json
import time
from typing import Optional

from google import genai
from google.genai import types

from backend.config import config, LANGUAGES

# ── AI Client (lazy singleton) ────────────────────────────────────────

_client: Optional[genai.Client] = None

# ── Rate limiter — stay safely under free-tier 15 RPM limit ──────────
_last_request_time: float = 0.0
_MIN_REQUEST_INTERVAL = 5.0  # seconds between requests (15 RPM = 4s gap, use 5s to be safe)


def _rate_limit_wait() -> None:
    """Sleep just enough to stay under the free-tier rate limit."""
    global _last_request_time
    elapsed = time.monotonic() - _last_request_time
    wait = _MIN_REQUEST_INTERVAL - elapsed
    if wait > 0:
        time.sleep(wait)
    _last_request_time = time.monotonic()


def get_client() -> Optional[genai.Client]:
    """Get or create the Gemini client. Returns None if not configured."""
    global _client
    if _client is not None:
        return _client
    if not config.google_api_key:
        return None
    try:
        _client = genai.Client()
        return _client
    except Exception:
        return None


# ── System Prompt ─────────────────────────────────────────────────────

def _build_system_prompt(target_lang: str, lang_code: str) -> str:
    """Build the Ubuntu localization system prompt for Gemini."""
    lang_info = LANGUAGES.get(lang_code, {})
    return f"""You are a professional Ubuntu Linux localization engine.

Target Language: {target_lang} ({lang_code})
Script: {lang_info.get('script', 'Standard Unicode')}
Word Order: {lang_info.get('word_order', 'SOV')}

Rules:
- Preserve ALL placeholders exactly: %s, %d, %f, %u, {{0}}, {{1}}, %(name)s
- Preserve HTML/XML tags: <b>, <i>, <span>, etc. and entities: &amp;, &#160;
- Preserve newlines (\\n) and whitespace patterns character-for-character
- Keep Ubuntu/Linux technical terms UNTRANSLATED:
  Kernel, GNOME, sudo, apt, repository, GRUB, X11, Wayland, ext4, Btrfs,
  LVM, DHCP, DNS, SSH, VPN, TCP, systemd, dbus, PulseAudio, PipeWire,
  AppArmor, Ubuntu, Canonical, Debian, Firefox, LibreOffice
- Translate ONLY natural language text
- Maintain the OS/software context — this is NOT general text
- For menu items and button labels: use concise imperative form
- For help text and descriptions: use natural explanatory language
- For error messages: clear, actionable, respectful tone
- Return ONLY a JSON array of translated strings, in the same order as input
- If a string should NOT be translated (brand names, code, symbols), return it unchanged
- NEVER use Zawgyi encoding — always Unicode Myanmar (Myanmar only)

Input is a JSON array of msgid strings to translate."""


def _format_gemini_error(error: Exception) -> str:
    message = str(error)
    if "User location is not supported" in message or "FAILED_PRECONDITION" in message:
        return (
            "Google Gemini blocked this request because the current API location is not supported. "
            "Use the app from a Gemini API supported region, run the backend on a server in a supported region, "
            "or switch to another translation provider."
        )
    return f"Gemini translation failed: {message}"


# ── Translation Engine ────────────────────────────────────────────────

def translate_batch(
    texts: list[str],
    target_lang: str,
    lang_code: str,
    retries: int = 2,
) -> list[str]:
    """Translate a batch of msgid strings to the target language using Gemini.

    Args:
        texts: List of msgid strings to translate
        target_lang: Human-readable language name (e.g. 'Myanmar')
        lang_code: ISO 639-3 language code (e.g. 'my')
        retries: Number of retry attempts on failure

    Returns:
        List of translated strings, same length as input. On failure,
        returns original texts unchanged.
    """
    client = get_client()
    if client is None:
        raise RuntimeError("Google API key not configured. Set GOOGLE_API_KEY in .env")

    prompt = _build_system_prompt(target_lang, lang_code)
    input_json = json.dumps(texts, ensure_ascii=False)

    for attempt in range(retries + 1):
        try:
            _rate_limit_wait()  # enforce minimum gap between requests
            response = client.models.generate_content(
                model=config.gemini_model,
                contents=f"{prompt}\n\nInput:\n{input_json}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                    ),
                    temperature=config.gemini_temperature,
                ),
            )

            result = json.loads(response.text)

            if not isinstance(result, list):
                raise ValueError("AI response is not a JSON array")

            # Align length safety
            result = result[:len(texts)]
            while len(result) < len(texts):
                result.append(texts[len(result)])

            return result

        except Exception as e:
            if "User location is not supported" in str(e) or "FAILED_PRECONDITION" in str(e):
                raise RuntimeError(_format_gemini_error(e)) from e
            # 429 rate-limit: respect the retry-delay the API returns, else backoff
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                import re as _re
                m = _re.search(r'retry.*?(\d+(?:\.\d+)?)s', str(e), _re.I)
                wait = float(m.group(1)) + 1 if m else 30
                if attempt < retries:
                    time.sleep(wait)
                    continue
                raise RuntimeError(
                    f"Rate limit reached (free tier quota). "
                    f"Wait ~{int(wait)}s and try again, or upgrade your Gemini API plan at https://ai.dev/rate-limit"
                ) from e
            if attempt < retries:
                wait = 2 ** attempt  # exponential backoff: 1s, 2s
                time.sleep(wait)
                continue
            raise RuntimeError(_format_gemini_error(e)) from e

    return list(texts)


# ── QA Verification ───────────────────────────────────────────────────

def qa_verify_batch(
    entries: list[dict],
    target_lang: str,
) -> list[dict]:
    """Run QA checks on translated entries.

    Args:
        entries: List of {msgid, translated, msgctxt?} dicts
        target_lang: Target language name

    Returns:
        List of {index, msgid, translated, checks: [...], passed: bool}
    """
    results = []

    for entry in entries:
        msgid = entry.get("msgid", "")
        translated = entry.get("translated", "")
        checks = []

        # Check 1: Placeholder integrity
        import re
        placeholders_src = set(re.findall(r'%[dsfu]|%\([^)]+\)[dsfu]|\{[0-9]*\}', msgid))
        placeholders_tgt = set(re.findall(r'%[dsfu]|%\([^)]+\)[dsfu]|\{[0-9]*\}', translated))
        missing = placeholders_src - placeholders_tgt
        extra = placeholders_tgt - placeholders_src
        checks.append({
            "name": "Placeholder Integrity",
            "passed": not missing and not extra,
            "detail": (
                f"OK" if not missing and not extra
                else f"Missing: {missing}" if missing
                else f"Extra: {extra}"
            ),
        })

        # Check 2: Newline count
        nl_src = msgid.count("\n")
        nl_tgt = translated.count("\n")
        checks.append({
            "name": "Newline Count",
            "passed": nl_src == nl_tgt,
            "detail": f"Source: {nl_src}, Target: {nl_tgt}",
        })

        # Check 3: Non-empty
        checks.append({
            "name": "Non-Empty",
            "passed": bool(translated.strip()),
            "detail": "OK" if translated.strip() else "Translation is empty",
        })

        # Check 4: Length sanity (0.3x – 4x)
        if msgid:
            ratio = len(translated) / len(msgid)
            checks.append({
                "name": "Length Ratio",
                "passed": 0.3 <= ratio <= 4.0,
                "detail": f"Ratio: {ratio:.1f}x",
            })
        else:
            checks.append({
                "name": "Length Ratio",
                "passed": True,
                "detail": "Source empty",
            })

        all_pass = all(c["passed"] for c in checks)

        results.append({
            "index": entry.get("index"),
            "msgid": msgid,
            "translated": translated,
            "checks": checks,
            "passed": all_pass,
        })

    return results


def check_available() -> bool:
    """Check if the translation AI is available."""
    return bool(config.google_api_key) and get_client() is not None
