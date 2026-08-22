/**
 * ============================================================================
 * THEME MANAGER — DARK / LIGHT MODE
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

export const Theme = {
  STORAGE_KEY: 'apdagu_theme_preference',

  init() {
    const savedTheme = localStorage.getItem(this.STORAGE_KEY) || 'light';
    this.apply(savedTheme);
    this.bindEvents();
  },

  apply(theme) {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem(this.STORAGE_KEY, theme);

    // Update toggle icons if present
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isDark ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars-fill text-secondary';
      }
    });
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.apply(next);
    return next;
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-toggle-btn')) {
        this.toggle();
      }
    });
  }
};
