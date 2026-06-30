# Implementation Plan — Ubuntu Localization Tool Redesign

**Date:** 2026-06-30
**Target Stack:** React/Next.js 14 + Tailwind CSS
**Architecture:** DB-less (static JSON files for data)

---

## Phase 1 — Critical Bugs (Accessibility Violations)

WCAG Level A violations that block assistive technology users.

### Task 1.1: Add Skip Navigation Link

**Files to modify:**
- `frontend/src/app/layout.tsx`

**Dependencies:** None

**Estimated effort:** 15 minutes

**Acceptance criteria:**
- [ ] Skip link is first focusable element in DOM
- [ ] Link is visually hidden until focused
- [ ] Clicking link moves focus to main content area
- [ ] Works with keyboard-only navigation

---

### Task 1.2: Add ARIA Attributes to Accordion

**Files to modify:**
- `frontend/src/app/guide/page.tsx`

**Dependencies:** None

**Estimated effort:** 30 minutes

**Acceptance criteria:**
- [ ] Each accordion button has `aria-expanded` attribute
- [ ] Each accordion button has `aria-controls` pointing to content panel
- [ ] `aria-expanded` toggles correctly on open/close
- [ ] Screen reader announces expanded/collapsed state

---

### Task 1.3: Add Labels to Translation Textareas

**Files to modify:**
- `frontend/src/app/translate/page.tsx`

**Dependencies:** None

**Estimated effort:** 45 minutes

**Acceptance criteria:**
- [ ] Each textarea has an associated `<label>` with `for` attribute
- [ ] Label includes source text context (e.g., first 30 chars of msgid)
- [ ] Label is programmatically associated with input
- [ ] Works with screen readers (NVDA, VoiceOver)

---

### Task 1.4: Add Label to File Upload Input

**Files to modify:**
- `frontend/src/app/translate/page.tsx`

**Dependencies:** None

**Estimated effort:** 15 minutes

**Acceptance criteria:**
- [ ] File input has `id` attribute
- [ ] `<label>` has `for` attribute matching input `id`
- [ ] Label text is visible: "Upload .po or .pot file"
- [ ] Clicking label opens file picker

---

## Phase 2 — Localization (i18n)

Ensure all UI text is translatable and properly formatted.

### Task 2.1: Create i18n Infrastructure

**Files to modify:**
- `frontend/src/lib/i18n.ts` (new)
- `frontend/src/data/translations.json` (new)
- `frontend/src/app/layout.tsx`

**Dependencies:** None

**Estimated effort:** 2 hours

**Acceptance criteria:**
- [ ] Translation function `t(key)` available in all components
- [ ] Supports 5 languages: en, my, shn, mnw, ksw
- [ ] Language stored in cookie, persists across sessions
- [ ] Language switcher in sidebar updates all UI text
- [ ] Missing translations fall back to English

---

### Task 2.2: Translate All Hardcoded Strings

**Files to modify:**
- `frontend/src/app/page.tsx`
- `frontend/src/app/templates/page.tsx`
- `frontend/src/app/translate/page.tsx`
- `frontend/src/app/glossary/page.tsx`
- `frontend/src/app/guide/page.tsx`
- `frontend/src/app/contributors/page.tsx`
- `frontend/src/app/history/page.tsx`
- `frontend/src/components/Sidebar.tsx`

**Dependencies:** Task 2.1

**Estimated effort:** 3 hours

**Acceptance criteria:**
- [ ] Zero hardcoded English strings in templates
- [ ] All user-facing text uses `{{ t('key') }}` pattern
- [ ] Language switcher changes all visible text
- [ ] Myanmar script renders correctly with proper line-height
- [ ] Shan/Mon/Karen scripts render without layout breaks

---

### Task 2.3: Add Glossary Disclaimer Translation

**Files to modify:**
- `frontend/src/app/glossary/page.tsx`
- `frontend/src/data/translations.json`

**Dependencies:** Task 2.1

**Estimated effort:** 30 minutes

**Acceptance criteria:**
- [ ] Disclaimer text is translatable
- [ ] Displays in selected UI language
- [ ] Links to GitHub remain functional in all languages

---

## Phase 3 — Responsive Design

Fix mobile overflow and ensure consistent behavior across viewports.

### Task 3.1: Convert Tables to Cards on Mobile

**Files to modify:**
- `frontend/src/app/templates/page.tsx`
- `frontend/src/app/glossary/page.tsx`
- `frontend/src/app/globals.css`

**Dependencies:** None

**Estimated effort:** 2 hours

**Acceptance criteria:**
- [ ] Tables transform to card layout below 768px
- [ ] Each card shows all fields with labels
- [ ] No horizontal scrolling on mobile
- [ ] Touch targets are 44px minimum
- [ ] Sort controls accessible on mobile

---

### Task 3.2: Fix Contributor Layout for Mobile

**Files to modify:**
- `frontend/src/app/contributors/page.tsx`

**Dependencies:** None

**Estimated effort:** 1 hour

**Acceptance criteria:**
- [ ] Cards stack in single column on mobile
- [ ] Avatar, name, karma all visible without overflow
- [ ] Language badges wrap properly
- [ ] Launchpad link is tappable (44px target)

---

### Task 3.3: Fix Quick Reference Card Overflow

**Files to modify:**
- `frontend/src/app/guide/quickref/page.tsx`

**Dependencies:** None

**Estimated effort:** 30 minutes

**Acceptance criteria:**
- [ ] ASCII art card scrolls horizontally on mobile
- [ ] Scroll indicator visible
- [ ] Print button works on mobile
- [ ] No content clipping

---

### Task 3.4: Fix Translate Page Mobile Layout

**Files to modify:**
- `frontend/src/app/translate/page.tsx`

**Dependencies:** None

**Estimated effort:** 1 hour

**Acceptance criteria:**
- [ ] Upload area full-width on mobile
- [ ] Language selector full-width on mobile
- [ ] Source/translation pairs stack vertically
- [ ] Textareas have minimum 80px height on mobile
- [ ] Action buttons full-width on mobile

---

### Task 3.5: Add `prefers-reduced-motion` Support

**Files to modify:**
- `frontend/src/app/globals.css`
- `frontend/tailwind.config.ts`

**Dependencies:** None

**Estimated effort:** 30 minutes

**Acceptance criteria:**
- [ ] All animations disabled when `prefers-reduced-motion: reduce`
- [ ] Transitions reduced to 0.01ms
- [ ] Spinner stops animating
- [ ] Toast notifications appear without slide-in

---

## Phase 4 — UX Improvements

Functional improvements that reduce friction and prevent errors.

### Task 4.1: Add ARIA Live Regions for Dynamic Content

**Files to modify:**
- `frontend/src/components/Toast.tsx` (new)
- `frontend/src/app/translate/page.tsx`
- `frontend/src/app/layout.tsx`

**Dependencies:** None

**Estimated effort:** 1 hour

**Acceptance criteria:**
- [ ] Toast container has `aria-live="polite"`
- [ ] Translation progress announced to screen readers
- [ ] Save success/failure announced
- [ ] Export completion announced

---

### Task 4.2: Fix Theme Toggle Accessibility

**Files to modify:**
- `frontend/src/components/Sidebar.tsx`

**Dependencies:** None

**Estimated effort:** 20 minutes

**Acceptance criteria:**
- [ ] Button has `aria-label="Toggle theme"`
- [ ] Button has `aria-pressed` reflecting current state
- [ ] Screen reader announces theme change
- [ ] Focus visible on keyboard navigation

---

### Task 4.3: Implement Active Nav State for Sub-routes

**Files to modify:**
- `frontend/src/components/Sidebar.tsx`

**Dependencies:** None

**Estimated effort:** 15 minutes

**Acceptance criteria:**
- [ ] `/contributors` highlights Contributors nav item
- [ ] `/guide/quickref` highlights Guide nav item
- [ ] `/templates` highlights Templates nav item
- [ ] Visual indicator (background + left border) visible

---

### Task 4.4: Create Custom 404 Page

**Files to modify:**
- `frontend/src/app/not-found.tsx` (new)

**Dependencies:** None

**Estimated effort:** 30 minutes

**Acceptance criteria:**
- [ ] Styled page matching app design
- [ ] Clear "Page not found" message
- [ ] Links to Dashboard, Translate, Guide
- [ ] Maintains sidebar navigation

---

### Task 4.5: Add Pagination to Templates and Glossary

**Files to modify:**
- `frontend/src/app/templates/page.tsx`
- `frontend/src/app/glossary/page.tsx`
- `frontend/src/components/Pagination.tsx`

**Dependencies:** None

**Estimated effort:** 1 hour

**Acceptance criteria:**
- [ ] 20 items per page
- [ ] Page numbers with ellipsis for large page counts
- [ ] Previous/Next buttons
- [ ] Current page highlighted
- [ ] URL updates with page parameter
- [ ] Resets to page 1 on filter/search change

---

### Task 4.6: Add Client-Side Search Filtering

**Files to modify:**
- `frontend/src/app/templates/page.tsx`
- `frontend/src/app/glossary/page.tsx`
- `frontend/src/components/SearchInput.tsx`

**Dependencies:** None

**Estimated effort:** 1 hour

**Acceptance criteria:**
- [ ] Search filters items as user types
- [ ] No server requests for filtering
- [ ] Clear button visible when search has text
- [ ] Empty state shown when no results
- [ ] Search resets pagination to page 1

---

### Task 4.7: Ensure `flushPendingSaves` Completes Before Export

**Files to modify:**
- `frontend/src/app/translate/page.tsx`

**Dependencies:** None

**Estimated effort:** 30 minutes

**Acceptance criteria:**
- [ ] Export button disabled while saves pending
- [ ] Loading indicator shown during save flush
- [ ] Export only triggers after all saves complete
- [ ] Error shown if any save fails

---

## Phase 5 — Visual Polish

Consistency, contrast, and professional finish.

### Task 5.1: Fix Color Contrast Failures

**Files to modify:**
- `frontend/tailwind.config.ts`
- `frontend/src/app/globals.css`

**Dependencies:** None

**Estimated effort:** 1 hour

**Acceptance criteria:**
- [ ] All text meets WCAG AA contrast (4.5:1 for normal, 3:1 for large)
- [ ] `--text-light` in dark mode increased to `#b0b0b0`
- [ ] Orange text used only for large text or has background
- [ ] Warning color readable on both light and dark backgrounds
- [ ] Quick reference comments readable on dark background

---

### Task 5.2: Extract CSS to External File

**Files to modify:**
- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`

**Dependencies:** None

**Estimated effort:** 1 hour

**Acceptance criteria:**
- [ ] All component styles in `globals.css`
- [ ] No inline `<style>` blocks in templates
- [ ] CSS cached independently by browser
- [ ] Tailwind utilities used instead of custom CSS where possible

---

### Task 5.3: Remove Inline Styles, Use Tailwind Classes

**Files to modify:**
- `frontend/src/app/page.tsx`
- `frontend/src/app/contributors/page.tsx`
- `frontend/src/app/glossary/page.tsx`
- `frontend/src/app/templates/page.tsx`

**Dependencies:** Task 5.2

**Estimated effort:** 2 hours

**Acceptance criteria:**
- [ ] Zero inline `style=""` attributes in templates
- [ ] All spacing uses Tailwind scale (p-4, gap-2, etc.)
- [ ] All colors use Tailwind theme tokens
- [ ] Design consistent across all pages

---

### Task 5.4: Add Subresource Integrity to External Scripts

**Files to modify:**
- `frontend/src/app/layout.tsx`

**Dependencies:** None

**Estimated effort:** 15 minutes

**Acceptance criteria:**
- [ ] All CDN scripts have `integrity` attribute
- [ ] `crossorigin="anonymous"` set on all external resources
- [ ] No mixed content warnings

---

### Task 5.5: Standardize Loading States

**Files to modify:**
- `frontend/src/app/page.tsx`
- `frontend/src/app/translate/page.tsx`
- `frontend/src/components/Spinner.tsx` (new)

**Dependencies:** None

**Estimated effort:** 30 minutes

**Acceptance criteria:**
- [ ] Single Spinner component used everywhere
- [ ] Consistent animation (CSS spin, not emoji)
- [ ] Accessible with `role="status"` and `aria-label`
- [ ] Reduced motion support

---

### Task 5.6: Add Glassmorphism Effects

**Files to modify:**
- `frontend/src/app/globals.css`
- `frontend/tailwind.config.ts`

**Dependencies:** None

**Estimated effort:** 30 minutes

**Acceptance criteria:**
- [ ] Cards have subtle glass effect (backdrop-blur + border)
- [ ] Effect visible on both light and dark backgrounds
- [ ] No performance issues on mobile
- [ ] Fallback for browsers without backdrop-filter support

---

### Task 5.7: Optimize Myanmar Script Typography

**Files to modify:**
- `frontend/src/app/globals.css`
- `frontend/tailwind.config.ts`

**Dependencies:** None

**Estimated effort:** 30 minutes

**Acceptance criteria:**
- [ ] Pyidaungsu or Noto Sans Myanmar font loaded
- [ ] Line-height 1.8 for Myanmar text
- [ ] No character clipping on descenders
- [ ] Proper rendering for Shan, Mon, Karen scripts
- [ ] Font fallback chain defined

---

## Dependency Graph

```
Phase 1 (Critical)     Phase 2 (Localization)
├── 1.1 Skip Nav       ├── 2.1 i18n Infra
├── 1.2 ARIA Accordion  │   └── 2.2 Translate Strings
├── 1.3 Textarea Labels │   └── 2.3 Disclaimer
└── 1.4 Upload Label    │
                        │
Phase 3 (Responsive)    │
├── 3.1 Table→Card      │
├── 3.2 Contributors    │
├── 3.3 Quickref        │
├── 3.4 Translate       │
└── 3.5 Reduced Motion  │
                        │
Phase 4 (UX)            │
├── 4.1 Live Regions    │
├── 4.2 Theme Toggle    │
├── 4.3 Active Nav      │
├── 4.4 404 Page        │
├── 4.5 Pagination      │
├── 4.6 Search          │
└── 4.7 Save→Export     │
                        │
Phase 5 (Polish)        │
├── 5.1 Contrast        │
├── 5.2 Extract CSS     │
├── 5.3 Remove Inline   │
├── 5.4 SRI             │
├── 5.5 Loading States  │
├── 5.6 Glass Effects   │
└── 5.7 Typography      │
```

## Total Effort Estimate

| Phase | Tasks | Effort |
|-------|-------|--------|
| Phase 1: Critical Bugs | 4 | 1.75 hours |
| Phase 2: Localization | 3 | 5.5 hours |
| Phase 3: Responsive | 5 | 5 hours |
| Phase 4: UX Improvements | 7 | 4.25 hours |
| Phase 5: Visual Polish | 7 | 5.75 hours |
| **Total** | **26** | **~22 hours** |

## Recommended Execution Order

1. **Phase 1** first — fixes blocking accessibility issues
2. **Phase 2** second — i18n infrastructure needed before UI work
3. **Phase 3** third — responsive fixes affect all subsequent work
4. **Phase 4** fourth — UX improvements build on responsive foundation
5. **Phase 5** last — polish applied to stable, functional code
