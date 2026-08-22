/**
 * ============================================================================
 * TOAST NOTIFICATION UTILITY
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

export const Toast = {
  container: null,

  init() {
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      el.style.zIndex = '9999';
      document.body.appendChild(el);
    }
    this.container = el;
  },

  show(title, message, type = 'info', duration = 3500) {
    if (!this.container) this.init();

    const toastId = 'toast-' + Date.now();
    const bgClass = {
      success: 'bg-success text-white',
      danger: 'bg-danger text-white',
      warning: 'bg-warning text-dark',
      info: 'bg-primary text-white'
    }[type] || 'bg-dark text-white';

    const iconClass = {
      success: 'bi-check-circle-fill',
      danger: 'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    }[type] || 'bi-bell-fill';

    const html = `
      <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center gap-2">
            <i class="bi ${iconClass} fs-5"></i>
            <div>
              ${title ? `<strong class="d-block">${title}</strong>` : ''}
              <small>${message}</small>
            </div>
          </div>
          <button type="button" class="btn-close ${type !== 'warning' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(toastId);

    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      const bsToast = new bootstrap.Toast(toastEl, { delay: duration });
      bsToast.show();
      toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    } else {
      setTimeout(() => toastEl.remove(), duration);
    }
  },

  success(title, msg) { this.show(title, msg, 'success'); },
  error(title, msg) { this.show(title, msg, 'danger'); },
  warning(title, msg) { this.show(title, msg, 'warning'); },
  info(title, msg) { this.show(title, msg, 'info'); }
};
