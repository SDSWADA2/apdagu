/**
 * ============================================================================
 * AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) — VERSI SEMPURNA
 * SD NEGERI SUMBER WARU 2 — KURIKULUM MERDEKA 2026
 * ============================================================================
 *
 * ROLE DEFINITIONS:
 *  - admin    : Akses penuh ke seluruh fitur termasuk manajemen pengguna
 *  - operator : Akses penuh kecuali manajemen pengguna & reset database
 *  - guru     : Akses terbatas — hanya lihat + input absensi & pelatihan sendiri
 *
 * FITUR:
 *  - Login / Logout dengan session persistence
 *  - Rate-limiting anti brute-force (5x salah → kunci 30 detik)
 *  - Session timeout otomatis (60 menit tidak aktif)
 *  - Ganti password dengan validasi lengkap
 *  - Manajemen user (tambah, edit, nonaktifkan) — admin only
 *  - applyUIPermissions() reactive terhadap role
 * ============================================================================
 */

// ---- Konstanta Global -------------------------------------------------------
const AUTH_STORAGE_KEY = 'SDN_SUMBER_WARU_2_ACTIVE_USER';
const AUTH_RATE_LIMIT_KEY = 'SDN_SW2_LOGIN_ATTEMPTS';
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 menit
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 detik

// Definisi hak akses view per role
const VIEW_PERMISSIONS = {
  admin: [
    'view-dashboard', 'view-guru', 'view-pendidikan', 'view-sertifikasi',
    'view-kepegawaian', 'view-jadwal', 'view-beban', 'view-absensi',
    'view-pkg', 'view-prestasi', 'view-pelatihan', 'view-dokumen',
    'view-laporan', 'view-pengaturan'
  ],
  operator: [
    'view-dashboard', 'view-guru', 'view-pendidikan', 'view-sertifikasi',
    'view-kepegawaian', 'view-jadwal', 'view-beban', 'view-absensi',
    'view-pkg', 'view-prestasi', 'view-pelatihan', 'view-dokumen',
    'view-laporan', 'view-pengaturan'
  ],
  guru: [
    'view-dashboard', 'view-guru', 'view-jadwal',
    'view-absensi', 'view-pkg', 'view-pelatihan', 'view-laporan'
  ]
};

// ---- Hak Akses Aksi per Role -----------------------------------------------
const ACTION_PERMISSIONS = {
  admin: {
    manage_users: true,
    delete_database: true,
    restore_database: true,
    edit_any_data: true,
    delete_any_data: true,
    export_laporan: true,
    view_all: true,
    manage_profil_sekolah: true,
    manage_backup: true,
    input_own_absensi: true,
    view_own_pkg: true,
    input_own_pelatihan: true,
    print_own_biodata: true
  },
  operator: {
    manage_users: false,
    delete_database: false,
    restore_database: true,
    edit_any_data: true,
    delete_any_data: true,
    export_laporan: true,
    view_all: true,
    manage_profil_sekolah: true,
    manage_backup: true,
    input_own_absensi: true,
    view_own_pkg: true,
    input_own_pelatihan: true,
    print_own_biodata: true
  },
  guru: {
    manage_users: false,
    delete_database: false,
    restore_database: false,
    edit_any_data: false,
    delete_any_data: false,
    export_laporan: false,
    view_all: false,
    manage_profil_sekolah: false,
    manage_backup: false,
    // Guru hanya bisa input data milik sendiri
    input_own_absensi: true,
    view_own_pkg: true,
    input_own_pelatihan: true,
    print_own_biodata: true
  }
};

// ============================================================================
// OBJEK UTAMA Auth
// ============================================================================
const Auth = {
  currentUser: null,
  _sessionTimer: null,
  _lastActivity: Date.now(),
  _activityHandler: null,

  // ==========================================================================
  // INISIALISASI
  // ==========================================================================
  // ---------- Inisialisasi — cek sesi tersimpan atau tampilkan login ----------
  async init() {
    // Coba pulihkan sesi dari storage (persisten lintas tab/reload)
    const restored = this._restoreSession();

    if (restored) {
      // Sesi valid ditemukan: lanjut tanpa tampilkan login
      this._startSessionWatcher();
      this._bindActivityListeners();
      this.applyUIPermissions();
      if (typeof App !== 'undefined') {
        App.switchView('view-dashboard');
      }
    } else {
      // Tidak ada sesi: tampilkan layar login
      this.showLoginScreen();
    }
  },

  // ---------- Login dengan Backend JWT atau Fallback Lokal ----------
  async login(username, password) {
    // Cek rate limiting
    const rate = this._checkRateLimit();
    if (rate.locked) {
      return { success: false, message: rate.message };
    }

    // --- Coba Backend Terlebih Dahulu ---
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();

      if (!response.ok) {
        this._recordFailedAttempt();
        // Gunakan pesan error dari server (result.error, bukan result.message)
        return { success: false, message: result.error || 'Username atau password salah!' };
      }

      // Format response backend: { token, user } — BUKAN result.data
      localStorage.setItem('jwt_token', result.token);
      this._resetRateLimit();
      this.currentUser = { ...result.user };
      this._refreshSession();
      this._startSessionWatcher();
      this._bindActivityListeners();
      this.applyUIPermissions();
      this.hideLoginScreen();

      if (typeof App !== 'undefined') {
        App.switchView('view-dashboard');
      }
      return { success: true, user: this.currentUser };

    } catch (e) {
      // --- Backend Tidak Tersedia: Fallback ke DB Lokal (Mode Offline) ---
      console.warn('[Auth] Backend tidak tersedia, menggunakan mode offline.', e.message);

      const users = typeof DB !== 'undefined' ? DB.getAll('users') : [];
      const user = users.find(u => u.username === username && (u.status || 'aktif') === 'aktif');

      if (!user || user.password !== password) {
        this._recordFailedAttempt();
        return { success: false, message: 'Username atau password salah!' };
      }

      this._resetRateLimit();
      this.currentUser = { ...user };
      this._refreshSession();
      this._startSessionWatcher();
      this._bindActivityListeners();
      this.applyUIPermissions();
      this.hideLoginScreen();

      if (typeof App !== 'undefined') {
        App.switchView('view-dashboard');
      }
      return { success: true, user: this.currentUser };
    }
  },

  // ==========================================================================
  // LOGOUT
  // ==========================================================================
  logout() {
    if (this.currentUser && typeof DB !== 'undefined') {
      DB.logActivity('Logout', 'users', `User "${this.currentUser.username}" keluar dari sistem.`);
    }
    // Hapus token JWT
    try { localStorage.removeItem('jwt_token'); } catch (e) { /* ignore */ }
    this._clearSession();
    this.currentUser = null;
    // Tampilkan layar login kembali
    this.showLoginScreen();
  },

  getCurrentUser() {
    return this.currentUser;
  },

  // ==========================================================================
  // CEK AKSES
  // ==========================================================================
  canAccessView(viewId) {
    if (!this.currentUser) return false;
    const role = this.currentUser.role;
    const allowedViews = VIEW_PERMISSIONS[role] || [];
    return allowedViews.includes(viewId);
  },

  canPerformAction(action) {
    if (!this.currentUser) return false;
    const role = this.currentUser.role;
    const perms = ACTION_PERMISSIONS[role] || {};
    return perms[action] === true;
  },

  isAdmin() { return this.currentUser && this.currentUser.role === 'admin'; },
  isOperator() { return this.currentUser && this.currentUser.role === 'operator'; },
  isGuru() { return this.currentUser && this.currentUser.role === 'guru'; },

  // Cek apakah data guru milik user sendiri (berlaku untuk role guru)
  isOwnData(guruId) {
    if (!this.currentUser) return false;
    if (this.isAdmin() || this.isOperator()) return true;
    return String(this.currentUser.guru_id) === String(guruId);
  },

  // ==========================================================================
  // LAYAR LOGIN
  // ==========================================================================
  showLoginScreen() {
    const overlay = document.getElementById('login-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    overlay.style.display = 'flex';

    // Reset form
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errEl = document.getElementById('login-error-msg');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) { passwordInput.value = ''; passwordInput.type = 'password'; }
    if (errEl) { errEl.textContent = ''; errEl.classList.add('d-none'); }

    const btnLogin = document.getElementById('btn-login-submit');
    if (btnLogin) { btnLogin.disabled = false; btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Masuk ke Sistem'; }

    // Reset toggle icon password
    const toggleIcon = document.getElementById('toggle-login-password');
    if (toggleIcon) toggleIcon.innerHTML = '<i class="bi bi-eye-fill"></i>';

    // Isi demo credentials jika ada tombolnya
    this._bindDemoCredentialButtons();

    setTimeout(() => { if (usernameInput) usernameInput.focus(); }, 150);
  },

  hideLoginScreen() {
    const overlay = document.getElementById('login-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  },

  handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errEl = document.getElementById('login-error-msg');
    const btnLogin = document.getElementById('btn-login-submit');

    const username = usernameInput?.value?.trim() || '';
    const password = passwordInput?.value || '';

    if (!username || !password) {
      if (errEl) { errEl.textContent = 'Username dan password tidak boleh kosong!'; errEl.classList.remove('d-none'); }
      if (!username && usernameInput) usernameInput.focus();
      else if (passwordInput) passwordInput.focus();
      return;
    }

    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Memverifikasi...';
    }
    if (errEl) errEl.classList.add('d-none');

    setTimeout(async () => {
      const result = await Auth.login(username, password);
      console.log(`Login attempt - Username: ${username}`);
      if (result.success) {
        if (typeof App !== 'undefined') {
          App.switchView('view-dashboard');
          App.showToast('Selamat Datang!', `Halo, <strong>${result.user.nama_lengkap}</strong>! Masuk sebagai <strong>${result.user.role.toUpperCase()}</strong>.`, 'success');
        }
      } else {
        if (errEl) {
          errEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>${result.message}`;
          errEl.classList.remove('d-none');
        }
        // Shake animation
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
          loginCard.classList.add('shake');
          setTimeout(() => loginCard.classList.remove('shake'), 500);
        }
        if (passwordInput) { passwordInput.value = ''; passwordInput.focus(); }
      }
      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Masuk ke Sistem';
      }
    }, 450);
  },

  // ==========================================================================
  // TOGGLE SHOW / HIDE PASSWORD
  // ==========================================================================
  togglePasswordVisibility(inputId, toggleBtnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(toggleBtnId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (btn) btn.innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
    } else {
      input.type = 'password';
      if (btn) btn.innerHTML = '<i class="bi bi-eye-fill"></i>';
    }
  },

  // ==========================================================================
  // GANTI PASSWORD
  // ==========================================================================
  showChangePasswordModal() {
    const modalEl = document.getElementById('modal-change-password');
    if (!modalEl) return;

    // Reset semua field & type
    ['cp-current', 'cp-new', 'cp-confirm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.type = 'password'; }
    });
    // Reset toggle icons
    ['cp-toggle-current', 'cp-toggle-new', 'cp-toggle-confirm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<i class="bi bi-eye-fill"></i>';
    });

    const errEl = document.getElementById('cp-error-msg');
    if (errEl) { errEl.textContent = ''; errEl.classList.add('d-none'); }

    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) modal = new bootstrap.Modal(modalEl);
    modal.show();

    setTimeout(() => { document.getElementById('cp-current')?.focus(); }, 350);
  },

  async handleChangePassword() {
    const current = document.getElementById('cp-current')?.value || '';
    const newPwd = document.getElementById('cp-new')?.value || '';
    const confirmPwd = document.getElementById('cp-confirm')?.value || '';
    const errEl = document.getElementById('cp-error-msg');
    const btnSave = document.getElementById('btn-save-change-password');

    const showError = (msg) => {
      if (errEl) { errEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>${msg}`; errEl.classList.remove('d-none'); }
    };
    const clearError = () => { if (errEl) errEl.classList.add('d-none'); };

    if (!this.currentUser) return;
    clearError();

    // Validasi sisi klien dulu
    if (!current || !newPwd || !confirmPwd) { showError('Semua field wajib diisi!'); return; }
    if (newPwd.length < 6) { showError('Password baru minimal 6 karakter!'); document.getElementById('cp-new')?.focus(); return; }
    if (newPwd === current) { showError('Password baru tidak boleh sama dengan password lama!'); document.getElementById('cp-new')?.focus(); return; }
    if (newPwd !== confirmPwd) { showError('Konfirmasi password tidak cocok!'); document.getElementById('cp-confirm')?.focus(); return; }

    if (btnSave) { btnSave.disabled = true; btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...'; }

    // Coba via API backend (jika tersedia)
    const token = localStorage.getItem('jwt_token');
    let savedViaAPI = false;
    if (token) {
      try {
        const res = await fetch('http://localhost:3000/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ current_password: current, new_password: newPwd })
        });
        const data = await res.json();
        if (!res.ok) {
          if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = 'Simpan Password Baru'; }
          showError(data.error || 'Gagal memperbarui password.');
          return;
        }
        savedViaAPI = true;
      } catch (e) {
        console.warn('[Auth] Backend tidak tersedia untuk ganti password, fallback lokal.');
      }
    }

    // Fallback: simpan ke DB lokal (mode offline)
    if (!savedViaAPI) {
      // Di mode offline, password disimpan sebagai plain text di localStorage
      const userInDB = typeof DB !== 'undefined' ? DB.getById('users', this.currentUser.id) : null;
      if (userInDB && userInDB.password !== current) {
        if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = 'Simpan Password Baru'; }
        showError('Password lama tidak cocok!');
        document.getElementById('cp-current')?.focus();
        return;
      }
      if (typeof DB !== 'undefined') {
        DB.update('users', this.currentUser.id, { password: newPwd },
          `User "${this.currentUser.username}" mengganti password.`
        );
      }
    }

    // Update currentUser di memori
    if (this.currentUser.password !== undefined) this.currentUser.password = newPwd;
    this._refreshSession();

    if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = 'Simpan Password Baru'; }
    bootstrap.Modal.getInstance(document.getElementById('modal-change-password'))?.hide();
    if (typeof App !== 'undefined') {
      App.showToast('Password Diperbarui', 'Password Anda berhasil diubah.', 'success');
    }
  },

  // ==========================================================================
  // MANAJEMEN USER — ADMIN ONLY
  // ==========================================================================
  renderUserTable() {
    const tbody = document.getElementById('tbody-users');
    if (!tbody) return;

    const users = DB.getAll('users');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-people me-2"></i>Belum ada data pengguna.</td></tr>';
      return;
    }

    const roleBadge = {
      admin: '<span class="badge bg-danger">ADMIN</span>',
      operator: '<span class="badge bg-success">OPERATOR</span>',
      guru: '<span class="badge bg-primary">GURU</span>'
    };
    const statusBadge = (s) => s === 'aktif'
      ? '<span class="badge bg-success-subtle text-success border border-success-subtle">Aktif</span>'
      : '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Nonaktif</span>';

    const canManage = this.canPerformAction('manage_users');

    tbody.innerHTML = users.map((u, idx) => {
      const guruLinked = u.guru_id
        ? (() => { const g = DB.getById('guru', u.guru_id); return g ? Helpers.escapeHTML(g.nama_lengkap) : '<em class="text-muted">Tidak ditemukan</em>'; })()
        : '<em class="text-muted">—</em>';
      const isSelf = this.currentUser && this.currentUser.id === u.id;
      return `
      <tr>
        <td class="text-muted small">${idx + 1}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${u.foto_url || ''}" alt="" class="rounded-circle border" width="36" height="36"
              style="object-fit:cover; flex-shrink:0;"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
            <div class="rounded-circle bg-primary text-white d-none align-items-center justify-content-center fw-bold"
              style="width:36px;height:36px;font-size:14px;flex-shrink:0;">
              ${Helpers.getInitials(u.nama_lengkap)}
            </div>
            <div>
              <div class="fw-semibold">${Helpers.escapeHTML(u.nama_lengkap)} ${isSelf ? '<span class="badge bg-info text-dark ms-1" style="font-size:10px;">Anda</span>' : ''}</div>
              <small class="text-muted">${Helpers.escapeHTML(u.email || '-')}</small>
            </div>
          </div>
        </td>
        <td><code class="text-body">${Helpers.escapeHTML(u.username)}</code></td>
        <td>${roleBadge[u.role] || `<span class="badge bg-secondary">${u.role}</span>`}</td>
        <td>${statusBadge(u.status || 'aktif')}</td>
        <td>${guruLinked}</td>
        <td>
          <div class="d-flex gap-1 flex-nowrap">
            <button class="btn btn-sm btn-outline-primary" onclick="Auth.showEditUserModal(${u.id})"
              title="Edit" ${!canManage ? 'disabled' : ''}>
              <i class="bi bi-pencil-fill"></i>
            </button>
            <button class="btn btn-sm btn-outline-${(u.status || 'aktif') === 'aktif' ? 'warning' : 'success'}"
              onclick="Auth.toggleUserStatus(${u.id})"
              title="${(u.status || 'aktif') === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}"
              ${!canManage || isSelf ? 'disabled' : ''}>
              <i class="bi bi-person-${(u.status || 'aktif') === 'aktif' ? 'dash' : 'check'}-fill"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="Auth.resetUserPassword(${u.id})"
              title="Reset Password" ${!canManage ? 'disabled' : ''}>
              <i class="bi bi-key-fill"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  showAddUserModal() {
    if (!this.canPerformAction('manage_users')) {
      if (typeof App !== 'undefined') App.showToast('Akses Ditolak', 'Anda tidak memiliki izin untuk menambah pengguna.', 'danger');
      return;
    }
    const modalEl = document.getElementById('modal-add-user');
    if (!modalEl) return;
    const form = document.getElementById('form-add-user');
    if (form) form.reset();
    const errEl = document.getElementById('add-user-error');
    if (errEl) errEl.classList.add('d-none');
    this._populateGuruSelect('add-user-guru-id');
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) modal = new bootstrap.Modal(modalEl);
    modal.show();
  },

  handleAddUser() {
    if (!this.canPerformAction('manage_users')) return;
    const gv = (id) => document.getElementById(id)?.value?.trim() || '';
    const errEl = document.getElementById('add-user-error');
    const showError = (msg) => { if (errEl) { errEl.textContent = msg; errEl.classList.remove('d-none'); } };

    const namaLengkap = gv('add-user-nama');
    const username = gv('add-user-username');
    const email = gv('add-user-email');
    const password = gv('add-user-password');
    const role = gv('add-user-role');
    const guruId = gv('add-user-guru-id');

    if (!namaLengkap || !username || !password || !role) { showError('Nama, Username, Password, dan Role wajib diisi!'); return; }
    if (password.length < 6) { showError('Password minimal 6 karakter!'); return; }
    if (DB.getAll('users').find(u => u.username.toLowerCase() === username.toLowerCase())) {
      showError(`Username "${username}" sudah digunakan!`); return;
    }

    DB.insert('users', {
      id: Helpers.generateId(),
      username, password,
      nama_lengkap: namaLengkap,
      email, role,
      status: 'aktif',
      guru_id: guruId ? parseInt(guruId) : null,
      foto_url: typeof generateAvatar !== 'undefined' ? generateAvatar(namaLengkap) : ''
    }, `Admin menambahkan user baru: "${username}" (${role.toUpperCase()})`);

    bootstrap.Modal.getInstance(document.getElementById('modal-add-user'))?.hide();
    this.renderUserTable();
    if (typeof App !== 'undefined') App.showToast('Pengguna Ditambahkan', `User "${username}" berhasil ditambahkan.`, 'success');
  },

  showEditUserModal(userId) {
    if (!this.canPerformAction('manage_users')) return;
    const user = DB.getById('users', userId);
    if (!user) return;
    const modalEl = document.getElementById('modal-edit-user');
    if (!modalEl) return;

    const sv = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    sv('edit-user-id', user.id);
    sv('edit-user-nama', user.nama_lengkap);
    sv('edit-user-username', user.username);
    sv('edit-user-email', user.email);
    sv('edit-user-role', user.role);
    sv('edit-user-status', user.status || 'aktif');
    this._populateGuruSelect('edit-user-guru-id', user.guru_id);

    const errEl = document.getElementById('edit-user-error');
    if (errEl) errEl.classList.add('d-none');
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) modal = new bootstrap.Modal(modalEl);
    modal.show();
  },

  handleEditUser() {
    if (!this.canPerformAction('manage_users')) return;
    const gv = (id) => document.getElementById(id)?.value?.trim() || '';
    const errEl = document.getElementById('edit-user-error');
    const showError = (msg) => { if (errEl) { errEl.textContent = msg; errEl.classList.remove('d-none'); } };

    const userId = parseInt(gv('edit-user-id'));
    const namaLengkap = gv('edit-user-nama');
    const username = gv('edit-user-username');
    const email = gv('edit-user-email');
    const role = gv('edit-user-role');
    const status = gv('edit-user-status');
    const guruId = gv('edit-user-guru-id');

    if (!namaLengkap || !username || !role) { showError('Nama, Username, dan Role wajib diisi!'); return; }
    if (DB.getAll('users').find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== userId)) {
      showError(`Username "${username}" sudah digunakan pengguna lain!`); return;
    }

    DB.update('users', userId, {
      nama_lengkap: namaLengkap, username, email, role, status,
      guru_id: guruId ? parseInt(guruId) : null
    }, `Admin memperbarui data user "${username}"`);

    if (this.currentUser && this.currentUser.id === userId) {
      Object.assign(this.currentUser, { nama_lengkap: namaLengkap, username, email, role, status });
      this._refreshSession();
      this.applyUIPermissions();
    }

    bootstrap.Modal.getInstance(document.getElementById('modal-edit-user'))?.hide();
    this.renderUserTable();
    if (typeof App !== 'undefined') App.showToast('Data Diperbarui', `Pengguna "${username}" berhasil diperbarui.`, 'success');
  },

  toggleUserStatus(userId) {
    if (!this.canPerformAction('manage_users')) return;
    if (this.currentUser && this.currentUser.id === userId) {
      if (typeof App !== 'undefined') App.showToast('Tidak Diizinkan', 'Anda tidak dapat menonaktifkan akun sendiri.', 'warning');
      return;
    }
    const user = DB.getById('users', userId);
    if (!user) return;
    const newStatus = (user.status || 'aktif') === 'aktif' ? 'nonaktif' : 'aktif';
    DB.update('users', userId, { status: newStatus },
      `Admin mengubah status user "${user.username}" menjadi "${newStatus}"`);
    this.renderUserTable();
    if (typeof App !== 'undefined') {
      App.showToast('Status Diperbarui', `User "${user.username}" sekarang ${newStatus}.`, newStatus === 'aktif' ? 'success' : 'warning');
    }
  },

  resetUserPassword(userId) {
    if (!this.canPerformAction('manage_users')) return;
    const user = DB.getById('users', userId);
    if (!user) return;
    const defaultPwd = user.role + '123';
    App.showConfirm('Reset Password', `Reset password "${user.username}" ke default: "${defaultPwd}"?`, () => {
      DB.update('users', userId, { password: defaultPwd }, `Admin me-reset password user "${user.username}"`);
      if (typeof App !== 'undefined') {
        App.showToast('Password Direset', `Password "${user.username}" berhasil direset ke "${defaultPwd}".`, 'info');
      }
    });
  },

  // ==========================================================================
  // TERAPKAN UI BERDASARKAN ROLE
  // ==========================================================================
  applyUIPermissions() {
    if (!this.currentUser) return;
    const role = this.currentUser.role;
    const allowedViews = VIEW_PERMISSIONS[role] || [];

    // --- Profil sidebar ---
    const nameEl = document.getElementById('user-profile-name');
    const roleEl = document.getElementById('user-profile-role');
    const avatarEl = document.getElementById('user-profile-avatar');
    const avatarInitialEl = document.getElementById('user-profile-avatar-initial');
    const topbarUserName = document.getElementById('topbar-user-name');
    const topbarUserRole = document.getElementById('topbar-user-role');

    if (nameEl) nameEl.textContent = this.currentUser.nama_lengkap;
    if (topbarUserName) topbarUserName.textContent = this.currentUser.nama_lengkap;
    if (topbarUserRole) topbarUserRole.textContent = role.toUpperCase();

    if (roleEl) {
      const roleBadges = {
        admin: '<span class="badge bg-danger">ADMINISTRATOR</span>',
        operator: '<span class="badge bg-success">OPERATOR</span>',
        guru: '<span class="badge bg-primary">GURU</span>'
      };
      roleEl.innerHTML = roleBadges[role] || `<span class="badge bg-secondary">${Helpers.escapeHTML(role)}</span>`;
    }
    if (avatarEl && this.currentUser.foto_url) {
      avatarEl.src = this.currentUser.foto_url;
      avatarEl.style.display = '';
    }
    if (avatarInitialEl) {
      avatarInitialEl.textContent = Helpers.getInitials(this.currentUser.nama_lengkap);
    }

    // --- Menu sidebar ---
    document.querySelectorAll('.nav-menu-link[data-view]').forEach(link => {
      const viewId = link.getAttribute('data-view');
      const li = link.closest('li');
      if (li) {
        if (allowedViews.includes(viewId)) {
          li.classList.remove('d-none');
        } else {
          li.classList.add('d-none');
        }
      }
    });

    // --- data-role-hide ---
    document.querySelectorAll('[data-role-hide]').forEach(el => {
      const hiddenRoles = (el.getAttribute('data-role-hide') || '').split(',').map(r => r.trim());
      if (hiddenRoles.includes(role)) {
        el.classList.add('d-none');
      } else {
        el.classList.remove('d-none');
      }
    });

    // --- data-role-show ---
    document.querySelectorAll('[data-role-show]').forEach(el => {
      const showRoles = (el.getAttribute('data-role-show') || '').split(',').map(r => r.trim());
      if (showRoles.includes(role)) {
        el.classList.remove('d-none');
      } else {
        el.classList.add('d-none');
      }
    });

    // --- data-permission (action buttons) ---
    document.querySelectorAll('[data-permission]').forEach(el => {
      const perm = el.getAttribute('data-permission');
      const allowed = this.canPerformAction(perm);
      if (allowed) {
        el.classList.remove('d-none');
      } else {
        el.classList.add('d-none');
      }
      if (el.tagName === 'BUTTON' || el.tagName === 'A') {
        el.disabled = !allowed;
        el.setAttribute('tabindex', allowed ? '0' : '-1');
      }
    });

    // --- Role switcher di topbar ---
    const roleSelect = document.getElementById('select-simulasi-role');
    if (roleSelect) roleSelect.value = role;
  },

  // Ringkasan izin untuk keperluan debug
  getPermissionSummary() {
    if (!this.currentUser) return null;
    const role = this.currentUser.role;
    return {
      user: this.currentUser.username,
      role,
      views: VIEW_PERMISSIONS[role] || [],
      actions: ACTION_PERMISSIONS[role] || {}
    };
  },

  // ==========================================================================
  // SESSION MANAGEMENT (INTERNAL)
  // ==========================================================================
  _refreshSession() {
    this._lastActivity = Date.now();
    const payload = JSON.stringify({ ...this.currentUser, _lastActivity: this._lastActivity });
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, payload);
      localStorage.setItem(AUTH_STORAGE_KEY, payload);
    } catch (e) { console.warn('Gagal menyimpan sesi:', e); }
  },

  _clearSession() {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) { /* ignore */ }
    if (this._sessionTimer) { clearInterval(this._sessionTimer); this._sessionTimer = null; }
    if (this._activityHandler) {
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
        document.removeEventListener(evt, this._activityHandler);
      });
      this._activityHandler = null;
    }
  },

  _startSessionWatcher() {
    if (this._sessionTimer) clearInterval(this._sessionTimer);
    this._sessionTimer = setInterval(() => {
      const idleMs = Date.now() - this._lastActivity;
      if (idleMs > SESSION_TIMEOUT_MS) {
        clearInterval(this._sessionTimer);
        this._sessionTimer = null;
        if (this.currentUser) {
          const username = this.currentUser.username;
          DB.logActivity('Session Timeout', 'users', `Sesi user "${username}" habis karena tidak aktif.`);
          this._clearSession();
          this.currentUser = null;
          this.showLoginScreen();
          if (typeof App !== 'undefined') {
            App.showToast('Sesi Berakhir', 'Sesi Anda telah habis karena tidak aktif. Silakan login kembali.', 'warning');
          }
        }
      }
    }, 60 * 1000); // Cek setiap 1 menit
  },

  _bindActivityListeners() {
    if (this._activityHandler) {
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
        document.removeEventListener(evt, this._activityHandler);
      });
    }
    this._activityHandler = () => { this._lastActivity = Date.now(); };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, this._activityHandler, { passive: true });
    });
  },

  // ==========================================================================
  // RATE LIMITING (INTERNAL)
  // ==========================================================================
  _checkRateLimit() {
    try {
      const data = JSON.parse(sessionStorage.getItem(AUTH_RATE_LIMIT_KEY) || '{}');
      if (data.lockUntil && Date.now() < data.lockUntil) {
        const remaining = Math.ceil((data.lockUntil - Date.now()) / 1000);
        return { locked: true, message: `Terlalu banyak percobaan gagal. Coba lagi dalam ${remaining} detik.` };
      }
      if (data.lockUntil && Date.now() >= data.lockUntil) {
        sessionStorage.removeItem(AUTH_RATE_LIMIT_KEY);
      }
    } catch (e) { /* ignore */ }
    return { locked: false };
  },

  _getAttemptCount() {
    try {
      return JSON.parse(sessionStorage.getItem(AUTH_RATE_LIMIT_KEY) || '{}').count || 0;
    } catch (e) { return 0; }
  },

  _recordFailedAttempt() {
    try {
      const data = JSON.parse(sessionStorage.getItem(AUTH_RATE_LIMIT_KEY) || '{}');
      data.count = (data.count || 0) + 1;
      if (data.count >= MAX_LOGIN_ATTEMPTS) data.lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      sessionStorage.setItem(AUTH_RATE_LIMIT_KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  },

  _resetRateLimit() {
    try { sessionStorage.removeItem(AUTH_RATE_LIMIT_KEY); } catch (e) { /* ignore */ }
  },

  // ==========================================================================
  // HELPER INTERNAL
  // ==========================================================================
  _populateGuruSelect(selectId, selectedGuruId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const gurus = DB.getAll('guru').filter(g => g.status_keaktifan !== 'Pensiun');
    select.innerHTML = '<option value="">— Tidak Terhubung ke Data Guru —</option>' +
      gurus.map(g => {
        const sel = selectedGuruId && String(g.id) === String(selectedGuruId) ? 'selected' : '';
        return `<option value="${g.id}" ${sel}>${Helpers.escapeHTML(g.nama_lengkap)}</option>`;
      }).join('');
  },

  // --------------------------------------------------------------------------
  // ROLE MANAGEMENT UTILITIES
  // --------------------------------------------------------------------------
  /**
   * Switch the current user session to another role (simulation).
   * Searches for a user with the given role and updates the session accordingly.
   * Returns true if the switch succeeded, false otherwise.
   */
  switchRole(targetRole) {
    const users = DB.getAll('users');
    const targetUser = users.find(u => u.role === targetRole);
    if (!targetUser) return false;
    // Update currentUser and refresh session storage
    this.currentUser = { ...targetUser };
    this._refreshSession();
    // Reapply UI permissions for the new role
    this.applyUIPermissions();
    return true;
  },

  /**
   * Get a list of all defined roles based on VIEW_PERMISSIONS mapping.
   * Useful for populating role selectors or debugging.
   */
  getAvailableRoles() {
    return Object.keys(VIEW_PERMISSIONS || {});
  },

  /**
   * Convenience wrapper to check view access for the current user.
   */
  isAuthorizedForView(viewId) {
    return this.canAccessView(viewId);
  },

  /**
   * Convenience wrapper to check action permission for the current user.
   */
  isAuthorizedForAction(action) {
    return this.canPerformAction(action);
  },

  _bindDemoCredentialButtons() {
    document.querySelectorAll('[data-demo-user]').forEach(btn => {
      // Hapus listener lama agar tidak menumpuk
      const newBtn = btn.cloneNode(true);
      btn.parentNode?.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        const credMap = { admin: { u: 'admin', p: 'admin123' }, operator: { u: 'operator', p: 'operator123' }, guru: { u: 'guru1', p: 'guru123' } };
        const cred = credMap[newBtn.getAttribute('data-demo-user')];
        if (cred) {
          const uEl = document.getElementById('login-username');
          const pEl = document.getElementById('login-password');
          if (uEl) uEl.value = cred.u;
          if (pEl) { pEl.value = cred.p; pEl.type = 'password'; }
        }
      });
    });
  }
};

