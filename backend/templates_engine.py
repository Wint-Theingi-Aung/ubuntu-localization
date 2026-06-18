"""Custom Jinja2 templates engine — bypasses Starlette caching issue."""

from pathlib import Path
from typing import Any, Mapping, Optional

from jinja2 import Environment, FileSystemLoader, pass_context
from starlette.background import BackgroundTask
from starlette.datastructures import URL
from starlette.requests import Request
from starlette.responses import HTMLResponse

from backend.config import PROJECT_ROOT
from backend.services.ui_translations import get_ui_lang, t as translate

TEMPLATE_DIR = PROJECT_ROOT / "backend" / "templates"


class Templates:
    """Lightweight Jinja2 template renderer — wraps Jinja2 directly to avoid
    the Starlette Jinja2Templates cache issue on Python 3.14."""

    def __init__(self):
        self.env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=False,  # We control escaping manually
            cache_size=0,      # Disable caching to avoid hashing issues
        )

        @pass_context
        def url_for(context, name: str, /, **path_params):
            request = context.get("request")
            if request and hasattr(request, "url_for"):
                return request.url_for(name, **path_params)
            return URL(f"/{name}")

        self.env.globals["url_for"] = url_for

        # ── Translation helper ────────────────────────────────────────
        @pass_context
        def t(context, key: str, **kwargs):
            """Translate a UI key to the current UI language."""
            lang = context.get("ui_lang", "my")
            return translate(key, lang, **kwargs)

        self.env.globals["t"] = t

    def render(self, template_name: str, context: dict[str, Any]) -> str:
        """Render a template with context."""
        template = self.env.get_template(template_name)
        return template.render(context)

    def TemplateResponse(
        self,
        request: Request,
        name: str,
        context: Optional[dict[str, Any]] = None,
        status_code: int = 200,
        headers: Optional[Mapping[str, str]] = None,
        media_type: Optional[str] = None,
        background: Optional[BackgroundTask] = None,
    ) -> HTMLResponse:
        """Return an HTML response from a rendered Jinja2 template."""
        ctx = dict(context or {})
        ctx.setdefault("request", request)

        # Auto-inject UI language from cookie
        ui_lang = get_ui_lang(request)
        ctx.setdefault("ui_lang", ui_lang)

        content = self.render(name, ctx)
        return HTMLResponse(
            content,
            status_code=status_code,
            headers=dict(headers or {}),
            media_type=media_type,
            background=background,
        )


# Singleton
templates = Templates()
