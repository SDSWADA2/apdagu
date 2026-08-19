/**
 * ============================================================================
 * THEME UTILITY MODULE
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * 
 * Mengelola tema tampilan (Light Mode / Dark Mode) serta persistensi di localStorage.
 * ============================================================================
 */

const ThemeUtil = {
  /**
   * Status tema yang sedang aktif ('light' atau 'dark')
   * @type {string}
   */
  currentTheme: 'light',

  /**
   * Menginisialisasi preferensi tema dari localStorage dan mendaftarkan event listener pada tombol toggle.
   */
  init() {
    const savedTheme = localStorage.getItem('SDN_SW2_THEME') || 'light';
    this.setTheme(savedTheme);

    const toggleBtn = document.getElementById('btn-theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(nextTheme);
      });
    }
  },

  /**
   * Mengubah tema aplikasi ke mode tertentu dan memperbarui atribut HTML serta ikon.
   * 
   * @param {'light'|'dark'} theme - Nama tema yang diinginkan ('light' atau 'dark').
   */
  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('SDN_SW2_THEME', theme);

    const iconEl = document.getElementById('theme-toggle-icon');
    if (iconEl) {
      if (theme === 'dark') {
        iconEl.className = 'bi bi-sun-fill text-warning';
      } else {
        iconEl.className = 'bi bi-moon-stars-fill text-dark';
      }
    }
  }
};
