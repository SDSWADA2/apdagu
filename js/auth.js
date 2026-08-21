/**
 * ============================================================================
 * AUTH MODULE — SISTEM OTENTIKASI LENGKAP
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 *
 * Mencakup:
 *  - Login / Logout dengan validasi
 *  - Manajemen sesi (sessionStorage + remember-me via localStorage)
 *  - Session timeout otomatis (60 menit)
 *  - Role-Based Access Control (RBAC): Admin, Operator, Guru
 *  - applyUIPermissions — tampil/sembunyikan elemen berdasarkan role
 *  - canAccessView — guard navigasi per halaman
 *  - showChangePasswordModal + handleChangePassword
 *  - switchRole untuk simulasi peran (dev/demo mode)
 *  - _restoreSession untuk pemulihan session saat refresh halaman
 * ============================================================================
 */

const AUTH_STORAGE_KEY = 'SDN_SW2_AUTH_SESSION';
const JWT_STORAGE_KEY = 'jwt_token';
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 menit inaktif

/**
 * Pemetaan hak akses view per role.
 * View yang tidak terdaftar → akses bebas.
 */
const VIEW_ACCESS = {
  'view-dashboard': ['admin', 'operator', 'guru'],
  'view-guru': ['admin', 'operator', 'guru'],
  'view-pendidikan': ['admin', 'operator'],
  'view-sertifikasi': ['admin', 'operator'],
  'view-kepegawaian': ['admin', 'operator'],
  'view-jadwal': ['admin', 'operator', 'guru'],
  'view-beban': ['admin', 'operator', 'guru'],
  'view-absensi': ['admin', 'operator', 'guru'],
  'view-pkg': ['admin', 'operator'],
  'view-prestasi': ['admin', 'operator', 'guru'],
  'view-pelatihan': ['admin', 'operator', 'guru'],
  'view-dokumen': ['admin', 'operator', 'guru'],
  'view-laporan': ['admin', 'operator', 'guru'],
  'view-pengaturan': ['admin'],
};

const Auth = {
  /** @type {Object|null} Data user yang sedang login */
  currentUser: null,

  /** @type {number} Timestamp aktivitas terakhir */
  _lastActivity: Date.now(),

  /** @type {number|null} ID interval untuk timeout checker */
  _timeoutInterval: null,

  // ==========================================================================
  // INISIALISASI
  // ==========================================================================
  async init() {
    const restored = this._restoreSession();
    if (restored) {
      this._startTimeoutChecker();
      this.applyUIPermissions();
      this._updateSidebarProfile();
      this._syncRoleSelector();
    } else {
      this.showLoginOverlay();
    }
    this._bindLoginForm();
    this._bindActivityListeners();
  },

  // ==========================================================================
  // LOGIN OVERLAY
  // ==========================================================================
  showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      overlay.classList.add('active');
      setTimeout(() => {
        const u = document.getElementById('login-username');
        if (u) u.focus();
      }, 450);
    }
    const appLayout = document.getElementById('app-layout');
    if (appLayout) appLayout.style.visibility = 'hidden';
  },

  hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.classList.remove('active');
    const appLayout = document.getElementById('app-layout');
    if (appLayout) appLayout.style.visibility = 'visible';
  },

  // ==========================================================================
  // BIND FORM LOGIN
  // ==========================================================================
  _bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Toggle visibilitas password
    const eyeBtn = document.getElementById('login-eye-btn');
    const pwdInput = document.getElementById('login-password');
    if (eyeBtn && pwdInput) {
      eyeBtn.addEventListener('click', () => {
        const isVisible = pwdInput.type === 'text';
        pwdInput.type = isVisible ? 'password' : 'text';
        const icon = eyeBtn.querySelector('i');
        if (icon) icon.className = isVisible ? 'bi bi-eye-fill' : 'bi bi-eye-slash-fill';
      });
    }

    // Klik baris hint → autofill username & password
    document.querySelectorAll('.login-hint-row[data-user]').forEach(row => {
      const fillHint = () => {
        const uEl = document.getElementById('login-username');
        const pEl = document.getElementById('login-password');
        if (uEl) { uEl.value = row.dataset.user || ''; uEl.classList.remove('is-invalid'); }
        if (pEl) { pEl.value = row.dataset.pass || ''; pEl.classList.remove('is-invalid'); }
        this._hideError();
      };
      row.addEventListener('click', fillHint);
      // Keyboard accessibility: Enter / Space
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fillHint(); }
      });
    });
  },

  // ==========================================================================
  // HANDLE LOGIN
  // ==========================================================================
  handleLogin() {
    const usernameEl = document.getElementById('login-username');
    const passwordEl = document.getElementById('login-password');
    const rememberEl = document.getElementById('login-remember');
    const btn = document.getElementById('login-submit-btn');

    const username = usernameEl ? usernameEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';
    const remember = rememberEl ? rememberEl.checked : false;

    // Reset state validasi
    if (usernameEl) usernameEl.classList.remove('is-invalid');
    if (passwordEl) passwordEl.classList.remove('is-invalid');
    this._hideError();

    // Validasi kosong
    if (!username) {
      if (usernameEl) usernameEl.classList.add('is-invalid');
      this._showError('Username tidak boleh kosong.');
      if (usernameEl) usernameEl.focus();
      return;
    }
    if (!password) {
      if (passwordEl) passwordEl.classList.add('is-invalid');
      this._showError('Password tidak boleh kosong.');
      if (passwordEl) passwordEl.focus();
      return;
    }

    // Loading state
    if (btn) btn.classList.add('loading');
    if (btn) btn.disabled = true;

    // Sedikit delay agar spinner terlihat
    setTimeout(() => {
      const users = typeof DB !== 'undefined' ? DB.getAll('users') : [];
      const user = users.find(u =>
        String(u.username).toLowerCase() === username.toLowerCase() &&
        u.password === password &&
        String(u.status).toLowerCase() !== 'nonaktif'
      );

      if (btn) btn.classList.remove('loading');
      if (btn) btn.disabled = false;

      if (!user) {
        if (usernameEl) usernameEl.classList.add('is-invalid');
        if (passwordEl) passwordEl.classList.add('is-invalid');
        this._showError('Username atau password salah. Silakan coba lagi.');
        this._shakeCard();
        if (passwordEl) { passwordEl.value = ''; passwordEl.focus(); }
        return;
      }

      // Sukses login
      this.currentUser = { ...user };
      if (this.currentUser.role) {
        this.currentUser.role = String(this.currentUser.role).toLowerCase();
      }
      this._lastActivity = Date.now();
      this._saveSession(remember);
      this._startTimeoutChecker();

      if (typeof DB !== 'undefined') {
        DB.logActivity('Login', 'users', `User "${user.username}" (${user.role}) berhasil masuk`);
      }

      this.hideLoginOverlay();
      this.applyUIPermissions();
      this._updateSidebarProfile();
      this._syncRoleSelector();

      if (typeof App !== 'undefined') {
        App.switchView('view-dashboard');
        App.showToast(
          'Login Berhasil',
          `Selamat datang, ${user.nama_lengkap}! (${String(user.role).toUpperCase()})`,
          'success'
        );
      }
    }, 700);
  },

  // ==========================================================================
  // LOGOUT
  // ==========================================================================
  logout() {
    if (typeof DB !== 'undefined' && this.currentUser) {
      DB.logActivity('Logout', 'users', `User "${this.currentUser.username}" keluar dari sistem`);
    }
    this._clearSession();
    this.currentUser = null;
    this._stopTimeoutChecker();
    this._clearLoginForm();
    this.showLoginOverlay();
    this.applyUIPermissions();
  },

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================
  _saveSession(remember) {
    const data = JSON.stringify({
      ...this.currentUser,
      _lastActivity: this._lastActivity,
      _remember: remember
    });
    sessionStorage.setItem(AUTH_STORAGE_KEY, data);
    if (remember) {
      localStorage.setItem(AUTH_STORAGE_KEY, data);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  _refreshSession() {
    this._lastActivity = Date.now();
    if (!this.currentUser) return;
    const isRemembered = (() => {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw)._remember === true : false;
      } catch (e) { return false; }
    })();
    this._saveSession(isRemembered);
  },

  _restoreSession() {
    try {
      const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) ||
        localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.username) return false;

      const elapsed = Date.now() - (parsed._lastActivity || 0);
      const remember = parsed._remember === true;
      if (!remember && elapsed > SESSION_TIMEOUT_MS) {
        this._clearSession();
        return false;
      }

      if (parsed.role) parsed.role = String(parsed.role).toLowerCase();
      this.currentUser = parsed;
      this._lastActivity = parsed._lastActivity || Date.now();
      this._refreshSession();
      return true;
    } catch (e) {
      console.warn('[Auth] Gagal memulihkan sesi:', e);
      return false;
    }
  },

  _clearSession() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(JWT_STORAGE_KEY);
  },

  _clearLoginForm() {
    ['login-username', 'login-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('is-invalid'); }
    });
    const rem = document.getElementById('login-remember');
    if (rem) rem.checked = false;
    this._hideError();
  },

  // ==========================================================================
  // SESSION TIMEOUT CHECKER
  // ==========================================================================
  _startTimeoutChecker() {
    this._stopTimeoutChecker();
    this._timeoutInterval = setInterval(() => {
      if (!this.currentUser) return;
      const isRemembered = (() => {
        try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')._remember; }
        catch (e) { return false; }
      })();
      const elapsed = Date.now() - this._lastActivity;
      if (!isRemembered && elapsed > SESSION_TIMEOUT_MS) {
        this._stopTimeoutChecker();
        if (typeof App !== 'undefined') {
          App.showToast('Sesi Berakhir', 'Anda keluar otomatis karena tidak aktif 60 menit.', 'warning');
        }
        setTimeout(() => this.logout(), 2500);
      }
    }, 60 * 1000);
  },

  _stopTimeoutChecker() {
    if (this._timeoutInterval) {
      clearInterval(this._timeoutInterval);
      this._timeoutInterval = null;
    }
  },

  _bindActivityListeners() {
    const refresh = () => { if (this.currentUser) this._refreshSession(); };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev => {
      document.addEventListener(ev, refresh, { passive: true });
    });
  },

  // ==========================================================================
  // UI HELPERS
  // ==========================================================================
  _shakeCard() {
    const card = document.querySelector('#login-overlay .login-card');
    if (!card) return;
    card.classList.remove('shake');
    void card.offsetWidth; // Force reflow
    card.classList.add('shake');
    card.addEventListener('animationend', () => card.classList.remove('shake'), { once: true });
  },

  _showError(msg) {
    const el = document.getElementById('login-error-msg');
    if (el) {
      el.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${msg}`;
      el.style.display = 'flex';
    }
  },

  _hideError() {
    const el = document.getElementById('login-error-msg');
    if (el) el.style.display = 'none';
  },

  // ==========================================================================
  // ROLE-BASED ACCESS CONTROL
  // ==========================================================================
  getCurrentUser() {
    return this.currentUser;
  },

  /**
   * Apakah user saat ini boleh mengakses viewId tertentu?
   * @param {string} viewId
   * @returns {boolean}
   */
  canAccessView(viewId) {
    if (!this.currentUser) return false;
    const allowed = VIEW_ACCESS[viewId];
    if (!allowed) return true;
    return allowed.includes(this.currentUser.role);
  },

  /**
   * Tampilkan/sembunyikan elemen UI sesuai role.
   * Gunakan atribut `data-role-access="admin,operator"` di elemen HTML.
   */
  applyUIPermissions() {
    const role = this.currentUser ? this.currentUser.role : null;

    // Menu sidebar
    document.querySelectorAll('.nav-menu-link[data-view]').forEach(link => {
      const viewId = link.getAttribute('data-view');
      const allowed = VIEW_ACCESS[viewId];
      const li = link.closest('.nav-menu-item');
      if (li) {
        li.style.display = (!role || (allowed && !allowed.includes(role))) ? 'none' : '';
      }
    });

    // Elemen dengan data-role-access
    document.querySelectorAll('[data-role-access]').forEach(el => {
      const allowedRoles = el.getAttribute('data-role-access').split(',').map(r => r.trim());
      el.style.display = (role && allowedRoles.includes(role)) ? '' : 'none';
    });

    // Badge role di sidebar
    const roleBadge = document.getElementById('user-profile-role');
    if (roleBadge) {
      const colorMap = { admin: 'danger', operator: 'success', guru: 'primary' };
      const labelMap = { admin: 'ADMIN', operator: 'OPERATOR', guru: 'GURU' };
      const color = colorMap[role] || 'secondary';
      const lbl = labelMap[role] || (role ? role.toUpperCase() : 'GUEST');
      roleBadge.innerHTML = `<span class="badge bg-${color}">${lbl}</span>`;
    }
  },

  // ==========================================================================
  // SIDEBAR PROFILE
  // ==========================================================================
  _updateSidebarProfile() {
    if (!this.currentUser) return;
    const nameEl = document.getElementById('user-profile-name');
    const avatarEl = document.getElementById('user-profile-avatar');
    if (nameEl) nameEl.textContent = this.currentUser.nama_lengkap || this.currentUser.username;
    if (avatarEl) {
      if (this.currentUser.foto_url) {
        avatarEl.src = this.currentUser.foto_url;
        avatarEl.style.display = '';
      } else {
        avatarEl.style.display = 'none';
      }
    }
  },

  // ==========================================================================
  // SYNC ROLE SELECTOR (dropdown topbar)
  // ==========================================================================
  _syncRoleSelector() {
    const sel = document.getElementById('select-simulasi-role');
    if (sel && this.currentUser) sel.value = this.currentUser.role;
  },

  // ==========================================================================
  // SWITCH ROLE — Simulasi untuk Demo
  // ==========================================================================
  switchRole(targetRole) {
    if (typeof DB === 'undefined') return false;
    const users = DB.getAll('users');
    const targetUser = users.find(u =>
      String(u.role).toLowerCase() === String(targetRole).toLowerCase()
    );
    if (!targetUser) return false;
    this.currentUser = { ...targetUser };
    if (this.currentUser.role) {
      this.currentUser.role = String(this.currentUser.role).toLowerCase();
    }
    this._refreshSession();
    this.applyUIPermissions();
    this._updateSidebarProfile();
    return true;
  },

  // ==========================================================================
  // GANTI PASSWORD
  // ==========================================================================
  showChangePasswordModal() {
    ['cp-current', 'cp-new', 'cp-confirm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const errEl = document.getElementById('cp-error-msg');
    if (errEl) errEl.classList.add('d-none');

    const modalEl = document.getElementById('modal-change-password');
    if (modalEl && typeof bootstrap !== 'undefined') {
      new bootstrap.Modal(modalEl).show();
    }
  },

  handleChangePassword() {
    const cur = (document.getElementById('cp-current') || {}).value || '';
    const nw = (document.getElementById('cp-new') || {}).value || '';
    const conf = (document.getElementById('cp-confirm') || {}).value || '';
    const errEl = document.getElementById('cp-error-msg');

    const showErr = (msg) => {
      if (errEl) { errEl.textContent = msg; errEl.classList.remove('d-none'); }
    };
    if (errEl) errEl.classList.add('d-none');

    if (!cur || !nw || !conf) { showErr('Semua kolom wajib diisi.'); return; }
    if (nw.length < 6) { showErr('Password baru minimal 6 karakter.'); return; }
    if (nw !== conf) { showErr('Konfirmasi password tidak cocok.'); return; }
    if (!this.currentUser) { showErr('Sesi tidak ditemukan. Silakan login ulang.'); return; }
    if (cur !== this.currentUser.password) { showErr('Password saat ini salah.'); return; }
    if (cur === nw) { showErr('Password baru tidak boleh sama dengan password lama.'); return; }

    if (typeof DB !== 'undefined') {
      DB.update('users', this.currentUser.id, { password: nw },
        `Ganti password user "${this.currentUser.username}"`);
    }
    this.currentUser.password = nw;
    this._refreshSession();

    const modalEl = document.getElementById('modal-change-password');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const inst = bootstrap.Modal.getInstance(modalEl);
      if (inst) inst.hide();
    }

    if (typeof App !== 'undefined') {
      App.showToast('Berhasil', 'Password berhasil diperbarui.', 'success');
    }
  },
};
