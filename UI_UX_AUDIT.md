# UI/UX Audit — Ubuntu Localization Tool

**Date:** 2026-06-30
**Auditor:** Claude Code
**Scope:** Complete frontend audit of Jinja2 + htmx application

---

## Executive Summary

The current application is a server-rendered Jinja2 + htmx single-page-like application with ~1,520 lines of inline CSS in `base.html` and substantial inline JavaScript. While functional, it has significant accessibility gaps, inconsistent styling patterns, and localization gaps. The redesign replaces this with React/Next.js + Tailwind CSS.

---

## Findings

### 1. No Skip Navigation Link

**Severity:** Critical (WCAG 2.4.1 Level A)

**Why it is a problem:** Keyboard-only users must tab through the entire sidebar navigation (5+ links) before reaching the main content on every page load. This is a direct WCAG violation and creates a poor experience for assistive technology users.

**Evidence:** `base.html` has no `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>` element at the top of the DOM.

**Affected files:**
- `backend/templates/base.html`

**Recommended solution:** Add a visually hidden skip link that becomes visible on focus, positioned as the first child of `<body>`.

**Estimated effort:** 15 minutes

---

### 2. Accordion Buttons Lack ARIA Attributes

**Severity:** Critical (WCAG 4.1.2 Level A)

**Why it is a problem:** The guide page accordion buttons use `onclick="toggleAccordion(this)"` but have no `aria-expanded` or `aria-controls` attributes. Screen readers cannot communicate whether a section is open or closed, making the guide page unusable for assistive technology users.

**Evidence:** `guide.html` lines 33-79 define `.guide-accordion-header` buttons with no ARIA state. The `toggleAccordion()` function in `base.html` toggles CSS classes but never updates ARIA attributes.

**Affected files:**
- `backend/templates/guide.html`
- `backend/templates/base.html` (inline JS)

**Recommended solution:** Add `aria-expanded="false"` to each accordion button, `aria-controls="{section-id}"` pointing to the content panel, and update these attributes in `toggleAccordion()`.

**Estimated effort:** 30 minutes

---

### 3. Translation Textareas Have No Labels

**Severity:** Critical (WCAG 1.3.1 Level A)

**Why it is a problem:** Each translation textarea in the translate workspace uses only `placeholder` text as a label. Placeholders disappear on focus, leaving no visible label. This violates WCAG 1.3.1 (Info and Relationships) and creates confusion about which entry is being translated.

**Evidence:** `translate.html` lines 311-312: `<textarea ... placeholder="Type translation or use AI below...">` with no associated `<label>` element.

**Affected files:**
- `backend/templates/translate.html`

**Recommended solution:** Add `<label>` elements with `for` attributes, or use `aria-label` with contextual information (e.g., "Translation for: {msgid}").

**Estimated effort:** 45 minutes

---

### 4. File Upload Input Lacks Label

**Severity:** Critical (WCAG 1.3.1 Level A)

**Why it is a problem:** The file upload input in `upload.html` has no associated `<label>` with a `for` attribute. The `<label class="form-file">` wrapper works for click behavior but is not programmatically associated with the input.

**Evidence:** `upload.html` lines 19-25: `<input type="file" ...>` has no `id` attribute and no `<label for="...">` pairing.

**Affected files:**
- `backend/templates/upload.html`

**Recommended solution:** Add `id="po-file"` to the input and `<label for="po-file">` with visible text.

**Estimated effort:** 15 minutes

---

### 5. Dark Mode Contrast Failures

**Severity:** High (WCAG 1.4.3 Level AA)

**Why it is a problem:** Multiple color combinations fail the 4.5:1 contrast ratio required for normal text in dark mode:
- `--text-light: #999999` on `--body-bg: #1a1a2e` = ~4.1:1 (fails)
- `--orange: #E95420` on `--card-bg: #252540` = ~3.7:1 (fails)
- `.quickref-card .comment: #666` on `#111122` = ~3.5:1 (fails)

**Evidence:** CSS custom properties in `base.html` lines 88-99 define dark theme colors that don't meet contrast requirements.

**Affected files:**
- `backend/templates/base.html`

**Recommended solution:** Increase `--text-light` to `#b0b0b0` in dark mode, change `.comment` color to `#8a8a8a`, and ensure all orange text has sufficient contrast or use orange only for large text.

**Estimated effort:** 30 minutes

---

### 6. Hardcoded English Strings Bypass i18n

**Severity:** High

**Why it is a problem:** Several templates contain hardcoded English strings instead of using the `{{ t('...') }}` translation function. This breaks the multi-language UI support for Myanmar, Shan, Mon, and Karen users.

**Evidence:**
- `export.html` lines 5, 6, 13, 21, 89: "Export Translations", "Step 4 of 4", "No file loaded", "Export Preview", "What Happens Next?"
- `upload.html` lines 5, 6, 23, 24, 37, 126-133: "Upload .po File", "Step 1 of 4", "Drop .po or .pot file here or click to browse"
- `quickref.html` lines 5, 7: "Quick Reference", "Full Guide"
- `upload_result.html` and `upload_error.html`: entirely English with no `{{ t() }}` calls
- `dashboard.html` lines 12, 14, 19, 33-38, 43-77: "Myanmar", "Shan", "Mon", "S'gaw Karen", "Loading contributors..."

**Affected files:**
- `backend/templates/export.html`
- `backend/templates/upload.html`
- `backend/templates/quickref.html`
- `backend/templates/upload_result.html`
- `backend/templates/upload_error.html`
- `backend/templates/dashboard.html`

**Recommended solution:** Replace all hardcoded strings with `{{ t('key') }}` calls and add corresponding entries to `ui_translations.py`.

**Estimated effort:** 2 hours

---

### 7. XSS Risk via `|safe` Filter

**Severity:** High (Security)

**Why it is a problem:** The `|safe` Jinja2 filter is used on translated strings, which disables HTML escaping. If translation values contain malicious HTML/JavaScript, this creates a cross-site scripting vulnerability.

**Evidence:**
- `dashboard.html` line 112: `{{ t('dashboard.ai_warning')|safe }}`
- `translate.html` lines 251, 260, 353: `{{ t('...')|safe }}`

**Affected files:**
- `backend/templates/dashboard.html`
- `backend/templates/translate.html`

**Recommended solution:** Remove `|safe` and use explicit HTML in templates instead of in translation strings. If HTML in translations is necessary, sanitize with a whitelist-based sanitizer.

**Estimated effort:** 1 hour

---

### 8. No Subresource Integrity on htmx CDN

**Severity:** High (Security)

**Why it is a problem:** htmx 2.0.4 is loaded from `unpkg.com` without an `integrity` attribute. If unpkg is compromised, malicious JavaScript could be injected into every page.

**Evidence:** `base.html` loads htmx: `<script src="https://unpkg.com/htmx.org@2.0.4" defer></script>` with no `integrity` or `crossorigin` attributes.

**Affected files:**
- `backend/templates/base.html`

**Recommended solution:** Add `integrity="sha384-..."` and `crossorigin="anonymous"` to the script tag, or self-host htmx.

**Estimated effort:** 15 minutes

---

### 9. No `prefers-reduced-motion` Support

**Severity:** Medium (WCAG 2.3.3 Level AAA)

**Why it is a problem:** Users who have enabled reduced motion in their OS settings will still see all animations: spinner rotation, toast slide-in, sidebar transitions, hover lifts, and accordion expand/collapse. This can cause motion sickness and discomfort.

**Evidence:** No `@media (prefers-reduced-motion: reduce)` query exists anywhere in the CSS.

**Affected files:**
- `backend/templates/base.html`

**Recommended solution:** Add a media query that disables or reduces all animations and transitions for users with reduced motion preferences.

**Estimated effort:** 30 minutes

---

### 10. `.btn-sm` and Pagination Buttons Violate Touch Target Minimum

**Severity:** Medium (WCAG 2.5.8 Level AA)

**Why it is a problem:** The app defines `--touch-target: 44px` but `.btn-sm` uses `min-height: 36px` and pagination buttons are ~30px. Mobile users with larger fingers will struggle to tap these precisely.

**Evidence:**
- `base.html` line 357: `.btn-sm { min-height: 36px }`
- `contributors_list.html` line 287-289: pagination buttons `min-width:32px;padding:4px 8px;font-size:12px`

**Affected files:**
- `backend/templates/base.html`
- `backend/templates/contributors_list.html`

**Recommended solution:** Increase `.btn-sm` to `min-height: 44px` and pagination buttons to `min-width: 44px; min-height: 44px`.

**Estimated effort:** 20 minutes

---

### 11. No ARIA Live Regions for Dynamic Content

**Severity:** Medium (WCAG 4.1.3 Level AA)

**Why it is a problem:** Toast notifications, batch translation results, and save indicators are injected into the DOM via htmx but screen readers are not notified. Users relying on assistive technology won't know when translations complete or saves succeed.

**Evidence:** Toast container in `base.html` has no `aria-live` attribute. htmx-swapped content regions lack `aria-live="polite"`.

**Affected files:**
- `backend/templates/base.html`
- `backend/static/js/app.js`

**Recommended solution:** Add `aria-live="polite"` and `role="status"` to the toast container and dynamic content regions.

**Estimated effort:** 30 minutes

---

### 12. Theme Toggle Lacks `aria-pressed` State

**Severity:** Medium (WCAG 4.1.2 Level A)

**Why it is a problem:** The theme toggle button has a `title` attribute but no `aria-label` or `aria-pressed` state. Screen reader users cannot determine whether dark or light mode is currently active.

**Evidence:** `base.html` line 1356: `<button class="theme-toggle" title="Toggle light/dark theme" onclick="toggleTheme()">`

**Affected files:**
- `backend/templates/base.html`

**Recommended solution:** Add `aria-label="Toggle theme"` and `aria-pressed={true|false}` that updates when the theme changes.

**Estimated effort:** 20 minutes

---

### 13. Heavy Inline Styles Undermine CSS Architecture

**Severity:** Medium (Maintainability)

**Why it is a problem:** Nearly every template uses inline `style=""` attributes with pixel values that bypass the design system's spacing scale. This creates maintenance difficulties and inconsistent spacing.

**Evidence:** `contributors_list.html` line 17: `style="display:flex;align-items:center;gap:12px;margin-bottom:var(--space-md);flex-wrap:wrap"`. Dashboard has 20+ inline style instances. Many use raw pixels instead of CSS custom properties.

**Affected files:**
- `backend/templates/dashboard.html`
- `backend/templates/contributors_list.html`
- `backend/templates/contributor.html`
- `backend/templates/partials/contributors_widget.html`

**Recommended solution:** Extract inline styles to CSS classes in `base.html` or create utility classes.

**Estimated effort:** 3 hours

---

### 14. Active Nav State Doesn't Match Sub-routes

**Severity:** Medium (UX)

**Why it is a problem:** The sidebar active state uses exact path matching. Navigating to `/contributors/contributor/username` does not highlight the "Contributors" nav item, leaving users without visual orientation.

**Evidence:** `base.html` sidebar uses `{% if request.url.path == '/contributors/' %}active{% endif %}` which fails for sub-paths.

**Affected files:**
- `backend/templates/base.html`

**Recommended solution:** Use `startswith()` instead of `==` for path matching: `{% if request.url.path.startswith('/contributors') %}active{% endif %}`.

**Estimated effort:** 15 minutes

---

### 15. `flushPendingSaves` Doesn't Await Completion

**Severity:** Medium (Data Loss Risk)

**Why it is a problem:** When a user clicks "Export", `flushPendingSaves()` fires all pending save requests but doesn't wait for them to complete before the export form submits. This can result in exported .po files missing recently edited translations.

**Evidence:** `base.html` lines 1522-1528: `flushPendingSaves` calls `fetch()` for each pending save but doesn't return a promise or await completion.

**Affected files:**
- `backend/templates/base.html`

**Recommended solution:** Make `flushPendingSaves` return `Promise.all()` of all save requests, and have the export form submission await it.

**Estimated effort:** 30 minutes

---

### 16. No Custom 404 Page

**Severity:** Low (UX)

**Why it is a problem:** Users who navigate to a non-existent URL see a generic FastAPI 404 JSON response instead of a styled error page that maintains the application's visual identity and provides helpful navigation.

**Evidence:** No `404.html` template exists in the templates directory.

**Affected files:**
- `backend/templates/` (new file needed)
- `backend/main.py`

**Recommended solution:** Create a `404.html` template extending `base.html` with a friendly error message and links to key pages. Add a FastAPI exception handler.

**Estimated effort:** 30 minutes

---

### 17. Duplicate Drag-and-Drop Implementations

**Severity:** Low (Maintainability)

**Why it is a problem:** Two separate implementations of drag-and-drop file upload exist: one in `app.js` (lines 47-77) and another in `base.html` inline script (lines 1458-1473). They use different approaches and can conflict.

**Evidence:** `app.js` uses `DataTransfer` API while the inline version directly assigns `e.dataTransfer.files`.

**Affected files:**
- `backend/static/js/app.js`
- `backend/templates/base.html`

**Recommended solution:** Remove one implementation and keep a single source of truth.

**Estimated effort:** 30 minutes

---

### 18. Inconsistent Loading State Patterns

**Severity:** Low (UX Consistency)

**Why it is a problem:** The dashboard uses a static hourglass emoji for "Loading contributors..." while all other pages use the standardized `.spinner` CSS class. This creates visual inconsistency.

**Evidence:** `dashboard.html` lines 95-98: `⏳ Loading contributors...` vs `translate.html` line 283: `<span class="spinner"></span> Loading session...`

**Affected files:**
- `backend/templates/dashboard.html`

**Recommended solution:** Replace the hourglass emoji with the `.spinner` class for consistency.

**Estimated effort:** 10 minutes

---

## Summary by Severity

| Severity | Count | Items |
|----------|-------|-------|
| Critical | 4 | #1, #2, #3, #4 |
| High | 4 | #5, #6, #7, #8 |
| Medium | 7 | #9, #10, #11, #12, #13, #14, #15 |
| Low | 3 | #16, #17, #18 |

## Total Estimated Effort

~14 hours for all fixes. The React/Next.js redesign addresses all findings natively through component-based architecture, Tailwind's built-in accessibility patterns, and proper ARIA support.
