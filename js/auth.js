/**
 * Frontend authentication/session manager.
 *
 * The SPA currently keeps its local role session in browser storage. The
 * backend JWT token can also be stored through setApiToken() for deployments
 * that use the online API.
 */
const AUTH_STORAGE_KEY = 'SDN_SUMBER_WARU_2_AUTH_SESSION_v1';
const API_TOKEN_KEY = 'SDN_SUMBER_WARU_2_API_TOKEN_v1';
const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

const ROLE_PERMISSIONS = Object.freeze({
  admin: ['*'],
  operator: [
    'view-dashboard', 'view-guru', 'view-pendidikan', 'view-sertifikasi',
    'view-kepegawaian', 'view-jadwal', 'view-beban-mengajar', 'view-absensi',
    'view-pkg', 'view-prestasi', 'view-pelatihan', 'view-dokumen',
    'view-laporan'
  ],
  guru: [
    'view-dashboard', 'view-guru', 'view-jadwal', 'view-absensi',
    'view-laporan'
  ],
  user: ['view-dashboard']
});

const Auth = {
  currentUser: null,
  _lastActivity: Date.now(),

  async init() {
    this._restoreSession();
    this._bindActivityListeners();

    if (!this.currentUser) {
      const users = typeof DB !== 'undefined' && typeof DB.getAll === 'function'
        ? DB.getAll('users')
        : [];
      const firstUser = users.find(user => String(user.status || 'aktif').toLowerCase() === 'aktif') || users[0];
      if (firstUser) {
        this.currentUser = this._sanitizeUser(firstUser);
        this._refreshSession();
      }
    }

    this.applyUIPermissions();
    return this.currentUser;
  },

  _sanitizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const { password, password_hash, ...safeUser } = user;
    return {
      ...safeUser,
      role: String(safeUser.role || 'user').toLowerCase()
    };
  },

  _restoreSession() {
    try {
      const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.username) return false;
      if (parsed._lastActivity && Date.now() - parsed._lastActivity > SESSION_TIMEOUT_MS) {
        this.logout(false);
        return false;
      }

      this.currentUser = this._sanitizeUser(parsed);
      this._lastActivity = parsed._lastActivity || Date.now();
      this._refreshSession();
      console.log('[Auth] Sesi dipulihkan untuk user:', this.currentUser.username);
      return true;
    } catch (error) {
      console.warn('[Auth] Gagal memulihkan sesi:', error);
      return false;
    }
  },

  _refreshSession() {
    if (!this.currentUser) return;
    this._lastActivity = Date.now();
    const session = JSON.stringify({
      ...this._sanitizeUser(this.currentUser),
      _lastActivity: this._lastActivity
    });
    sessionStorage.setItem(AUTH_STORAGE_KEY, session);
    localStorage.setItem(AUTH_STORAGE_KEY, session);
  },

  _bindActivityListeners() {
    if (this._activityBound) return;
    this._activityBound = true;
    ['click', 'keydown', 'pointerdown'].forEach(eventName => {
      document.addEventListener(eventName, () => {
        if (this.currentUser) this._lastActivity = Date.now();
      }, { passive: true });
    });
  },

  async login(username, password, options = {}) {
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new Error('Username dan password wajib diisi.');
    }

    const apiBase = options.apiBase || '';
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Login gagal.');

    if (payload.token) this.setApiToken(payload.token);
    if (payload.user) {
      this.currentUser = this._sanitizeUser(payload.user);
      this._refreshSession();
      this.applyUIPermissions();
    }
    return this.currentUser;
  },

  logout(showMessage = true) {
    const previousUser = this.currentUser;
    this.currentUser = null;
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(API_TOKEN_KEY);
    localStorage.removeItem(API_TOKEN_KEY);

    if (showMessage && typeof App !== 'undefined' && typeof App.showToast === 'function') {
      App.showToast('Logout', `Sesi ${previousUser?.username || ''} telah diakhiri.`, 'info');
    }
    this.applyUIPermissions();
  },

  setApiToken(token) {
    if (!token) {
      sessionStorage.removeItem(API_TOKEN_KEY);
      localStorage.removeItem(API_TOKEN_KEY);
      return;
    }
    sessionStorage.setItem(API_TOKEN_KEY, token);
    localStorage.setItem(API_TOKEN_KEY, token);
  },

  getApiToken() {
    return sessionStorage.getItem(API_TOKEN_KEY) || localStorage.getItem(API_TOKEN_KEY) || null;
  },

  getAuthHeaders() {
    const token = this.getApiToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  isAuthenticated() {
    return Boolean(this.currentUser);
  },

  hasRole(...roles) {
    const role = String(this.currentUser?.role || '').toLowerCase();
    return roles.map(item => String(item).toLowerCase()).includes(role);
  },

  canAccessView(viewId) {
    if (!this.currentUser) return false;
    const role = String(this.currentUser.role || 'user').toLowerCase();
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
    return permissions.includes('*') || permissions.includes(viewId);
  },

  switchRole(targetRole) {
    if (typeof DB === 'undefined' || typeof DB.getAll !== 'function') return false;
    const normalizedTarget = String(targetRole || '').toLowerCase();
    const users = DB.getAll('users');
    const targetUser = users.find(user => String(user.role || '').toLowerCase() === normalizedTarget);
    if (!targetUser) return false;

    this.currentUser = this._sanitizeUser(targetUser);
    this._refreshSession();
    this.applyUIPermissions();
    return true;
  },

  applyUIPermissions() {
    const role = String(this.currentUser?.role || 'user').toLowerCase();
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;

    document.querySelectorAll('.nav-menu-link[data-view]').forEach(link => {
      const viewId = link.getAttribute('data-view');
      const allowed = permissions.includes('*') || permissions.includes(viewId);
      link.hidden = !allowed;
      link.setAttribute('aria-hidden', String(!allowed));
    });

    const nameTargets = ['current-user-name', 'user-name', 'profile-user-name'];
    nameTargets.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = this.currentUser?.nama_lengkap || this.currentUser?.username || 'Pengguna';
    });

    const roleTargets = ['current-user-role', 'user-role', 'profile-user-role'];
    roleTargets.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = role.toUpperCase();
    });
  },

  async changePassword(currentPassword, newPassword) {
    const token = this.getApiToken();
    if (!token) throw new Error('Sesi API belum tersedia.');

    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Gagal mengubah password.');
    return payload;
  },

  showChangePasswordModal() {
    const currentPassword = window.prompt('Masukkan password saat ini:');
    if (currentPassword === null) return;
    const newPassword = window.prompt('Masukkan password baru (minimal 12 karakter):');
    if (newPassword === null) return;

    this.changePassword(currentPassword, newPassword)
      .then(() => {
        if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
          App.showToast('Berhasil', 'Password berhasil diperbarui.', 'success');
        }
      })
      .catch(error => {
        if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
          App.showToast('Gagal', error.message, 'danger');
        }
      });
  }
};

window.Auth = Auth;
