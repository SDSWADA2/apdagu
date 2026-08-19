/**
 * ============================================================================
 * TOAST UTILITY MODULE
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * 
 * Mengelola penyajian dan penghapusan notifikasi toast dinamis di antarmuka pengguna.
 * ============================================================================
 */

const ToastUtil = {
  /**
   * Menampilkan pesan notifikasi toast dengan tipe visual tertentu.
   * 
   * @param {string} title - Judul notifikasi yang akan ditampilkan.
   * @param {string} message - Pesan/isi rinci dari notifikasi.
   * @param {'primary'|'success'|'danger'|'warning'|'info'} [type='primary'] - Jenis notifikasi.
   * @param {number} [duration=4500] - Durasi notifikasi melayang sebelum otomatis menghilang (ms).
   */
  show(title, message, type = 'primary', duration = 4500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: 'bi-check-circle-fill text-success',
      danger: 'bi-x-circle-fill text-danger',
      warning: 'bi-exclamation-triangle-fill text-warning',
      info: 'bi-info-circle-fill text-info',
      primary: 'bi-bell-fill text-primary'
    };

    const toastId = 'toast-' + Helpers.generateId();
    const toastHtml = `
      <div id="${toastId}" class="toast-custom mb-2">
        <i class="bi ${icons[type] || icons.primary} fs-4"></i>
        <div class="flex-grow-1">
          <strong class="d-block" style="font-size: 0.85rem;">${Helpers.escapeHTML(title)}</strong>
          <small class="text-muted">${Helpers.escapeHTML(message)}</small>
        </div>
        <button type="button" class="btn-close ms-auto" onclick="document.getElementById('${toastId}').remove()"></button>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);

    setTimeout(() => {
      const el = document.getElementById(toastId);
      if (el) el.remove();
    }, duration);
  }
};
