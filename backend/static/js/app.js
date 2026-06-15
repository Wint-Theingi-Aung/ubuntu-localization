/**
 * Ubuntu Localization Tool — Frontend JavaScript
 * htmx-powered reactive UI with Ubuntu design system.
 */

// ── htmx Configuration ────────────────────────────────────────────────

htmx.config.defaultSwapStyle = 'innerHTML';
htmx.config.timeout = 30000;  // 30s for AI translation calls

// ── Toast Notification System ──────────────────────────────────────────

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(msg, type = 'info', duration = 3000) {
    if (!this.container) this.init();
    const toast = document.createElement('div');
    toast.className = `toast ${type}-banner`;
    toast.innerHTML = msg;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error', 6000); },
  warning(msg) { this.show(msg, 'warning', 5000); },
  info(msg) { this.show(msg, 'info'); },
};

// ── Drag-and-Drop File Upload ─────────────────────────────────────────

function initDropZone(zone) {
  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('dragover');
    });
  });

  zone.addEventListener('drop', e => {
    const input = zone.querySelector('input[type="file"]');
    if (input && e.dataTransfer.files.length) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Update label
      const textEl = zone.querySelector('.form-file-text');
      if (textEl) textEl.textContent = e.dataTransfer.files[0].name;
    }
  });
}

// ── File Input Change Handler ─────────────────────────────────────────

function handleFileSelect(input) {
  const zone = input.closest('.form-file');
  if (zone) {
    const textEl = zone.querySelector('.form-file-text');
    if (textEl && input.files.length) {
      textEl.textContent = input.files[0].name;
    }
  }
}

// ── Auto-save Translations ────────────────────────────────────────────

function initAutoSave() {
  document.addEventListener('blur', e => {
    if (!e.target.matches('.auto-save')) return;
    const form = e.target.closest('form');
    if (!form || !form.action) return;

    const data = new FormData(form);
    fetch(form.action, {
      method: 'POST',
      body: data,
    }).then(r => r.text()).then(html => {
      const sentinel = form.querySelector('.save-indicator');
      if (sentinel) {
        sentinel.textContent = '✓ Saved';
        sentinel.className = 'save-indicator saved';
        setTimeout(() => {
          sentinel.textContent = '';
          sentinel.className = 'save-indicator';
        }, 2000);
      }
    }).catch(() => {
      const sentinel = form.querySelector('.save-indicator');
      if (sentinel) {
        sentinel.textContent = '✗ Error';
        sentinel.className = 'save-indicator error';
      }
    });
  }, true);
}

// ── Keyboard Navigation for Translate Page ────────────────────────────

function initTranslateKeyboard() {
  document.addEventListener('keydown', e => {
    // Ctrl+Enter to submit batch translation
    if (e.ctrlKey && e.key === 'Enter') {
      const btn = document.querySelector('.translate-pair button[type="submit"]');
      if (btn) btn.click();
    }
    // Tab between translation fields
    if (e.key === 'Tab' && e.target.matches('.auto-save')) {
      // Natural tab behavior works, just add visual focus
      e.target.style.borderColor = 'var(--orange)';
    }
  });
}

// ── Session Progress Polling ──────────────────────────────────────────

function initProgressPolling(sessionId) {
  if (!sessionId) return;
  const checkProgress = () => {
    fetch(`/translate/progress/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.completion_pct >= 100) {
          Toast.success('🎉 All strings translated! Ready to export.');
        }
      });
  };
  setInterval(checkProgress, 15000);
}

// ── Initialize Everything ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  initAutoSave();
  initTranslateKeyboard();

  // Initialize all drop zones
  document.querySelectorAll('.form-file').forEach(initDropZone);

  // htmx event hooks
  document.body.addEventListener('htmx:afterRequest', e => {
    // Re-initialize drop zones in new content
    e.target.querySelectorAll('.form-file').forEach(initDropZone);
  });

  document.body.addEventListener('htmx:responseError', e => {
    Toast.error(`Request failed (${e.detail.xhr.status}). Try again.`);
  });
});

// ── Exports ───────────────────────────────────────────────────────────
window.Toast = Toast;
window.initDropZone = initDropZone;
window.handleFileSelect = handleFileSelect;
