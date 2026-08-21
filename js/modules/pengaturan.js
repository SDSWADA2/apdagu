/**
 * ============================================================================
 * MODUL PENGATURAN, PROFIL SEKOLAH, USERS, AUDIT LOG & BACKUP RESTORE
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const PengaturanModule = {
  init() {
    this.bindEvents();
    this.renderProfilSekolah();
    this.renderVisualAndTema();
    this.renderAdvancedAndIntegration();
    this.renderUsers();
    this.renderAuditLogs();
    this.renderBackendSettings();
    this.renderGDriveSettings();
    this.initSyncWatcher();
    this.applyTheme();
  },

  bindEvents() {
    // Save Profil Sekolah Form
    const formProfil = document.getElementById('form-profil-sekolah');
    if (formProfil) {
      formProfil.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfilSekolah();
      });
    }

    // Identitas Visual Form
    const formVisual = document.getElementById('form-identitas-visual');
    if (formVisual) {
      formVisual.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveIdentitasVisual();
      });
    }

    // Tema Form - Auto Sync & Auto Save
    const inputWarnaAplikasi = document.getElementById('input-warna-aplikasi');
    const inputWarnaIDCard = document.getElementById('input-warna-idcard');

    const handleColorInput = () => this.saveTemaWarna(true);
    const handleColorChange = () => this.saveTemaWarna(false);

    if (inputWarnaAplikasi) {
      inputWarnaAplikasi.addEventListener('input', handleColorInput);
      inputWarnaAplikasi.addEventListener('change', handleColorChange);
    }
    if (inputWarnaIDCard) {
      inputWarnaIDCard.addEventListener('input', handleColorInput);
      inputWarnaIDCard.addEventListener('change', handleColorChange);
    }

    const formTema = document.getElementById('form-tema-warna');
    if (formTema) {
      formTema.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveTemaWarna(false);
      });

      const btnResetTema = document.getElementById('btn-reset-tema');
      if (btnResetTema) {
        btnResetTema.addEventListener('click', () => {
          this.resetTemaWarna();
        });
      }
    }

    // File inputs preview and auto-save
    const handleImagePreview = (inputId, previewId) => {
      const input = document.getElementById(inputId);
      const preview = document.getElementById(previewId);
      if (input && preview) {
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              preview.src = ev.target.result;
              this.saveIdentitasVisual(); // Auto-save after preview loads
            };
            reader.readAsDataURL(file);
          }
        });
      }
    };
    handleImagePreview('input-logo-sekolah', 'preview-logo-sekolah');
    handleImagePreview('input-ttd-ks', 'preview-ttd-ks');



    // JSON Import File Listener
    const importInput = document.getElementById('input-restore-json');
    if (importInput) {
      importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const info = await ExportUtils.parseImportJSON(file);

          // Tampilkan modal konfirmasi dengan info backup
          const modalHtml = `
            <div class="modal fade" id="modal-confirm-restore" tabindex="-1">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header bg-warning">
                    <h5 class="modal-title"><i class="bi bi-exclamation-triangle-fill me-2"></i>Konfirmasi Restore Database</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                  </div>
                  <div class="modal-body">
                    <p class="mb-2">Anda akan menimpa seluruh database yang ada saat ini dengan file cadangan berikut:</p>
                    <table class="table table-sm table-bordered">
                      <tr><td class="fw-semibold">Nama Sekolah</td><td>${info.namaSekolah}</td></tr>
                      <tr><td class="fw-semibold">Jumlah Guru</td><td>${info.jumlahGuru} orang</td></tr>
                      <tr><td class="fw-semibold">Jumlah Absensi</td><td>${info.jumlahAbsensi} rekaman</td></tr>
                      <tr><td class="fw-semibold">Jumlah Pelatihan</td><td>${info.jumlahPelatihan} rekaman</td></tr>
                    </table>
                    <div class="alert alert-danger mb-0"><i class="bi bi-shield-exclamation me-2"></i><strong>Peringatan:</strong> Tindakan ini tidak dapat dibatalkan. Data yang ada sekarang akan ditimpa permanen.</div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                    <button type="button" class="btn btn-danger" id="btn-commit-restore">
                      <i class="bi bi-cloud-upload-fill me-2"></i>Ya, Restore Sekarang
                    </button>
                  </div>
                </div>
              </div>
            </div>`;

          document.getElementById('modal-confirm-restore')?.remove();
          document.body.insertAdjacentHTML('beforeend', modalHtml);

          const modalEl = document.getElementById('modal-confirm-restore');
          const modalInstance = new bootstrap.Modal(modalEl);
          modalInstance.show();

          document.getElementById('btn-commit-restore').addEventListener('click', () => {
            modalInstance.hide();
            ExportUtils.commitImportJSON(info.data);
          });

          modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
            importInput.value = '';
          });
        } catch (err) {
          importInput.value = '';
          console.warn('Import dibatalkan atau gagal:', err.message);
        }
      });
    }
  },

  renderProfilSekolah() {
    const prof = DB.state.profil_sekolah || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('profil-npsn', prof.npsn);
    setVal('profil-nss', prof.nss);
    setVal('profil-nama', prof.nama_sekolah);
    setVal('profil-bentuk', prof.bentuk_pendidikan);
    setVal('profil-akreditasi', prof.akreditasi);
    setVal('profil-alamat', prof.alamat_lengkap);
    setVal('profil-desa', prof.desa_kelurahan);
    setVal('profil-kecamatan', prof.kecamatan);
    setVal('profil-kabupaten', prof.kabupaten_kota);
    setVal('profil-provinsi', prof.provinsi);
    setVal('profil-kodepos', prof.kode_pos);
    setVal('profil-telp', prof.telepon);
    setVal('profil-email', prof.email);
    setVal('profil-ks-nama', prof.nama_kepala_sekolah);
    setVal('profil-ks-nip', prof.nip_kepala_sekolah);
  },

  saveProfilSekolah() {
    const data = {
      npsn: document.getElementById('profil-npsn').value.trim(),
      nss: document.getElementById('profil-nss').value.trim(),
      nama_sekolah: document.getElementById('profil-nama').value.trim(),
      bentuk_pendidikan: document.getElementById('profil-bentuk').value,
      akreditasi: document.getElementById('profil-akreditasi').value,
      alamat_lengkap: document.getElementById('profil-alamat').value.trim(),
      desa_kelurahan: document.getElementById('profil-desa').value.trim(),
      kecamatan: document.getElementById('profil-kecamatan').value.trim(),
      kabupaten_kota: document.getElementById('profil-kabupaten').value.trim(),
      provinsi: document.getElementById('profil-provinsi').value.trim(),
      kode_pos: document.getElementById('profil-kodepos').value.trim(),
      telepon: document.getElementById('profil-telp').value.trim(),
      email: document.getElementById('profil-email').value.trim(),
      nama_kepala_sekolah: document.getElementById('profil-ks-nama').value.trim(),
      nip_kepala_sekolah: document.getElementById('profil-ks-nip').value.trim()
    };

    DB.state.profil_sekolah = data;
    DB.logActivity('Ubah Profil Sekolah', 'profil_sekolah', 'Memperbarui data profil lembaga SDN Sumber Waru 2');
    DB.saveState();

    App.showToast('Sukses', 'Profil sekolah SDN Sumber Waru 2 berhasil disimpan.', 'success');
  },

  renderVisualAndTema() {
    const appSettings = DB.state.pengaturan_aplikasi || {};

    const logoSrc = appSettings.logo_sekolah || 'assets/logo-placeholder.png';
    const ttdSrc = appSettings.ttd_kepala_sekolah || 'assets/ttd-placeholder.png';

    const previewLogo = document.getElementById('preview-logo-sekolah');
    if (previewLogo) previewLogo.src = logoSrc;

    const previewTTD = document.getElementById('preview-ttd-ks');
    if (previewTTD) previewTTD.src = ttdSrc;

    const inputWarnaAplikasi = document.getElementById('input-warna-aplikasi');
    if (inputWarnaAplikasi) inputWarnaAplikasi.value = appSettings.warna_utama_aplikasi || '#2563eb';

    const inputWarnaIDCard = document.getElementById('input-warna-idcard');
    if (inputWarnaIDCard) inputWarnaIDCard.value = appSettings.warna_tema_idcard || '#0f172a';
  },

  renderAdvancedAndIntegration() {
    const config = DB.state.konfigurasi_sistem || {};
    const elTimezone = document.getElementById('adv-timezone');
    const elFormat = document.getElementById('adv-date-format');
    const elLang = document.getElementById('adv-language');
    const elTimeout = document.getElementById('adv-session-timeout');
    
    if (elTimezone && config.timezone) elTimezone.value = config.timezone;
    if (elFormat && config.format) elFormat.value = config.format;
    if (elLang && config.language) elLang.value = config.language;
    if (elTimeout && config.timeout) {
       elTimeout.value = config.timeout;
       const toVal = document.getElementById('timeout-val');
       if (toVal) toVal.innerText = config.timeout;
    }

    if (config.security) {
       const secPwd = document.getElementById('sec-strong-pwd');
       const secLogout = document.getElementById('sec-force-logout');
       const secApi = document.getElementById('sec-api-lock');
       if (secPwd) secPwd.checked = config.security.strong_password;
       if (secLogout) secLogout.checked = config.security.force_logout;
       if (secApi) secApi.checked = config.security.api_lock;
    }

    const intg = DB.state.integrasi || {};
    if (intg.smtp) {
       const host = document.getElementById('int-smtp-host');
       const port = document.getElementById('int-smtp-port');
       const sec = document.getElementById('int-smtp-sec');
       const user = document.getElementById('int-smtp-user');
       if (host) host.value = intg.smtp.host || '';
       if (port) port.value = intg.smtp.port || '';
       if (sec) sec.value = intg.smtp.sec || 'ssl';
       if (user) user.value = intg.smtp.user || '';
    }
    if (intg.wa) {
       const url = document.getElementById('int-wa-url');
       const active = document.getElementById('int-wa-active');
       if (url) url.value = intg.wa.url || '';
       if (active) active.checked = intg.wa.active || false;
    }
  },

  saveIdentitasVisual() {
    const logoInput = document.getElementById('input-logo-sekolah');
    const ttdInput = document.getElementById('input-ttd-ks');
    const appSettings = DB.state.pengaturan_aplikasi || {};

    const saveChanges = () => {
      DB.state.pengaturan_aplikasi = appSettings;
      DB.logActivity('Ubah Identitas Visual', 'pengaturan', 'Memperbarui Logo Sekolah atau Tanda Tangan');
      DB.saveState();
      App.showToast('Sukses', 'Identitas visual (Logo / TTD) berhasil disimpan.', 'success');
    };

    let filesToRead = 0;

    if (logoInput && logoInput.files[0]) {
      filesToRead++;
      const reader = new FileReader();
      reader.onload = (e) => {
        appSettings.logo_sekolah = e.target.result;
        filesToRead--;
        if (filesToRead === 0) saveChanges();
      };
      reader.readAsDataURL(logoInput.files[0]);
    }

    if (ttdInput && ttdInput.files[0]) {
      filesToRead++;
      const reader = new FileReader();
      reader.onload = (e) => {
        appSettings.ttd_kepala_sekolah = e.target.result;
        filesToRead--;
        if (filesToRead === 0) saveChanges();
      };
      reader.readAsDataURL(ttdInput.files[0]);
    }

    if (filesToRead === 0) {
      App.showToast('Info', 'Tidak ada gambar baru yang diunggah.', 'info');
    }
  },

  saveTemaWarna(silent = false) {
    const warnaAplikasi = document.getElementById('input-warna-aplikasi').value;
    const warnaIDCard = document.getElementById('input-warna-idcard').value;

    if (!DB.state.pengaturan_aplikasi) DB.state.pengaturan_aplikasi = {};
    DB.state.pengaturan_aplikasi.warna_utama_aplikasi = warnaAplikasi;
    DB.state.pengaturan_aplikasi.warna_tema_idcard = warnaIDCard;

    if (!silent) {
      DB.logActivity('Ubah Tema Warna', 'pengaturan', `Mengubah warna tema aplikasi (${warnaAplikasi}) dan ID Card (${warnaIDCard})`);
    }
    DB.saveState();

    this.applyTheme();
    if (!silent) {
      App.showToast('Sukses', 'Tema warna aplikasi berhasil diterapkan.', 'success');
    }
  },

  resetTemaWarna() {
    App.showConfirm('Reset Tema', 'Apakah Anda yakin ingin mengembalikan tema ke warna bawaan awal?', () => {
      if (!DB.state.pengaturan_aplikasi) DB.state.pengaturan_aplikasi = {};
      DB.state.pengaturan_aplikasi.warna_utama_aplikasi = '#2563eb';
      DB.state.pengaturan_aplikasi.warna_tema_idcard = '#0f172a';
      DB.saveState();
      this.renderVisualAndTema();
      this.applyTheme();
      App.showToast('Reset Berhasil', 'Tema warna dikembalikan ke default.', 'info');
    });
  },

  applyTheme() {
    const appSettings = DB.state.pengaturan_aplikasi || {};
    const primaryColor = appSettings.warna_utama_aplikasi || '#2563eb';

    let styleEl = document.getElementById('dynamic-theme-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-theme-style';
      document.head.appendChild(styleEl);
    }

    let r = 37, g = 99, b = 235; // default
    if (primaryColor.length === 7) {
      r = parseInt(primaryColor.substr(1, 2), 16);
      g = parseInt(primaryColor.substr(3, 2), 16);
      b = parseInt(primaryColor.substr(5, 2), 16);
    }

    styleEl.innerHTML = `
      :root {
        --bs-primary: ${primaryColor};
        --bs-primary-rgb: ${r}, ${g}, ${b};
      }
      .bg-primary { background-color: var(--bs-primary) !important; }
      .text-primary { color: var(--bs-primary) !important; }
      .btn-primary { 
        background-color: var(--bs-primary) !important; 
        border-color: var(--bs-primary) !important; 
      }
      .btn-outline-primary {
        color: var(--bs-primary) !important;
        border-color: var(--bs-primary) !important;
      }
      .btn-outline-primary:hover {
        background-color: var(--bs-primary) !important;
        color: #fff !important;
      }
      .nav-pills .nav-link.active {
        background-color: var(--bs-primary) !important;
      }
    `;
  },

  renderUsers() {
    const container = document.getElementById('users-management-container');
    if (!container) return;

    const currentUser = Auth.getCurrentUser();
    const canManage = Auth.canPerformAction('manage_users');
    const users = DB.getAll('users');

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 class="fw-bold mb-0"><i class="bi bi-people-fill me-2 text-primary"></i>Manajemen Pengguna Sistem</h6>
          <small class="text-muted">${users.length} akun terdaftar</small>
        </div>
        ${canManage ? `
        <button class="btn btn-primary btn-sm" onclick="PengaturanModule.openUserModal()">
          <i class="bi bi-person-plus-fill me-1"></i>Tambah User
        </button>` : '<span class="badge bg-warning text-dark"><i class="bi bi-lock me-1"></i>Hanya Admin yang dapat mengelola user</span>'}
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="text-center" style="width:45px;">#</th>
              <th>Pengguna</th>
              <th>Email</th>
              <th>Role</th>
              <th class="text-center">Status</th>
              ${canManage ? '<th class="text-center">Aksi</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${users.map((u, idx) => {
              const isCurrentUser = currentUser && currentUser.id === u.id;
              const roleBadges = {
                admin: '<span class="badge bg-danger">ADMINISTRATOR</span>',
                operator: '<span class="badge bg-success">OPERATOR</span>',
                guru: '<span class="badge bg-primary">GURU</span>'
              };
              const statusBadge = (u.status || 'aktif') === 'aktif'
                ? '<span class="badge bg-success">Aktif</span>'
                : '<span class="badge bg-secondary">Nonaktif</span>';

              return `
              <tr ${isCurrentUser ? 'class="table-primary"' : ''}>
                <td class="text-center fw-bold text-muted">${idx + 1}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <img src="${u.foto_url || ''}" class="avatar-teacher" alt="${u.username}" onerror="this.src=''">
                    <div>
                      <strong>${u.nama_lengkap}</strong>
                      ${isCurrentUser ? '<span class="badge bg-info text-dark ms-1">Anda</span>' : ''}
                      <small class="d-block text-muted">@${u.username}</small>
                    </div>
                  </div>
                </td>
                <td><small>${u.email || '-'}</small></td>
                <td>${roleBadges[u.role] || u.role}</td>
                <td class="text-center">${statusBadge}</td>
                ${canManage ? `
                <td class="text-center">
                  <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="PengaturanModule.openUserModal(${u.id})" title="Edit User">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="PengaturanModule.resetUserPassword(${u.id})" title="Reset Password">
                      <i class="bi bi-key"></i>
                    </button>
                    ${!isCurrentUser ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="PengaturanModule.deleteUser(${u.id})" title="Hapus User">
                      <i class="bi bi-trash3"></i>
                    </button>` : '<button class="btn btn-sm btn-outline-secondary" disabled title="Tidak bisa hapus diri sendiri"><i class="bi bi-shield-lock"></i></button>'}
                  </div>
                </td>` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  openUserModal(userId = null) {
    const isEdit = !!userId;
    const user = isEdit ? DB.getById('users', userId) : null;

    // Remove existing modal if any
    document.getElementById('modal-user-mgmt')?.remove();

    const guruList = DB.getAll('guru');
    const guruOptions = guruList.map(g => `<option value="${g.id}" ${user && user.guru_id === g.id ? 'selected' : ''}>${g.nama_lengkap}</option>`).join('');

    const modalHtml = `
    <div class="modal fade" id="modal-user-mgmt" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-person-${isEdit ? 'gear' : 'plus-fill'} me-2"></i>
              ${isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label fw-semibold">Nama Lengkap <span class="text-danger">*</span></label>
              <input type="text" id="um-nama" class="form-control" value="${user ? user.nama_lengkap : ''}" placeholder="Nama lengkap pengguna" required>
            </div>
            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="form-label fw-semibold">Username <span class="text-danger">*</span></label>
                <input type="text" id="um-username" class="form-control" value="${user ? user.username : ''}" placeholder="username" autocomplete="off" required>
              </div>
              <div class="col-6">
                <label class="form-label fw-semibold">Role <span class="text-danger">*</span></label>
                <select id="um-role" class="form-select">
                  <option value="guru" ${user && user.role === 'guru' ? 'selected' : ''}>Guru</option>
                  <option value="operator" ${user && user.role === 'operator' ? 'selected' : ''}>Operator</option>
                  <option value="admin" ${user && user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                </select>
              </div>
            </div>
            ${!isEdit ? `
            <div class="mb-3">
              <label class="form-label fw-semibold">Password <span class="text-danger">*</span></label>
              <input type="password" id="um-password" class="form-control" placeholder="Minimal 6 karakter" autocomplete="new-password" required>
            </div>` : ''}
            <div class="mb-3">
              <label class="form-label fw-semibold">Email</label>
              <input type="email" id="um-email" class="form-control" value="${user ? (user.email || '') : ''}" placeholder="email@sekolah.sch.id">
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold">Tautkan ke Data Guru (Opsional)</label>
              <select id="um-guru-id" class="form-select">
                <option value="">-- Tidak ditautkan --</option>
                ${guruOptions}
              </select>
              <small class="text-muted">Hubungkan user ini ke data guru agar fitur "lihat data sendiri" berfungsi.</small>
            </div>
            <div class="mb-0">
              <label class="form-label fw-semibold">Status Akun</label>
              <select id="um-status" class="form-select">
                <option value="aktif" ${!user || (user.status || 'aktif') === 'aktif' ? 'selected' : ''}>Aktif</option>
                <option value="nonaktif" ${user && user.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
            <div id="um-error-msg" class="alert alert-danger mt-3 d-none"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light border" data-bs-dismiss="modal">Batal</button>
            <button type="button" class="btn btn-primary fw-bold" onclick="PengaturanModule.saveUser(${userId || 'null'})">
              <i class="bi bi-check-circle-fill me-1"></i>${isEdit ? 'Simpan Perubahan' : 'Tambah Pengguna'}
            </button>
          </div>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('modal-user-mgmt');
    new bootstrap.Modal(modalEl).show();
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
  },

  saveUser(userId) {
    const nama = document.getElementById('um-nama')?.value.trim() || '';
    const username = document.getElementById('um-username')?.value.trim().toLowerCase() || '';
    const role = document.getElementById('um-role')?.value || 'guru';
    const email = document.getElementById('um-email')?.value.trim() || '';
    const guruId = document.getElementById('um-guru-id')?.value || null;
    const status = document.getElementById('um-status')?.value || 'aktif';
    const passwordInput = document.getElementById('um-password');
    const errEl = document.getElementById('um-error-msg');
    const isEdit = !!userId;

    const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.classList.remove('d-none'); } };

    if (!nama || !username) { showErr('Nama lengkap dan username wajib diisi!'); return; }
    if (username.length < 3) { showErr('Username minimal 3 karakter!'); return; }

    // Cek username unik
    const existing = DB.getAll('users').find(u => u.username === username && u.id !== userId);
    if (existing) { showErr(`Username "@${username}" sudah digunakan oleh pengguna lain!`); return; }

    if (!isEdit) {
      const pwd = passwordInput?.value || '';
      if (pwd.length < 6) { showErr('Password baru minimal 6 karakter!'); return; }
    }

    const userColor = { admin: '#1e3a8a', operator: '#10b981', guru: '#2563eb' }[role] || '#64748b';

    const data = {
      nama_lengkap: nama,
      username,
      role,
      email,
      guru_id: guruId ? parseInt(guruId) : null,
      status,
      foto_url: generateAvatar(nama, userColor)
    };

    if (isEdit) {
      DB.update('users', userId, data);
      DB.logActivity('Edit User', 'users', `Memperbarui data pengguna "@${username}" (${role})`);
      App.showToast('User Diperbarui', `Data pengguna "@${username}" berhasil diperbarui.`, 'success');
    } else {
      data.password = passwordInput.value;
      data.id = Helpers.generateId();
      DB.insert('users', data);
      DB.logActivity('Tambah User', 'users', `Menambahkan pengguna baru "@${username}" dengan role ${role}`);
      App.showToast('User Ditambahkan', `Pengguna "@${username}" berhasil ditambahkan.`, 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('modal-user-mgmt'))?.hide();
    this.renderUsers();

    // Re-apply permissions jika user yang diedit adalah user saat ini
    const currentUser = Auth.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      Auth.applyUIPermissions();
    }
  },

  resetUserPassword(userId) {
    const user = DB.getById('users', userId);
    if (!user) return;

    document.getElementById('modal-reset-pwd')?.remove();

    const modalHtml = `
    <div class="modal fade" id="modal-reset-pwd" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header bg-warning">
            <h5 class="modal-title"><i class="bi bi-key-fill me-2"></i>Reset Password</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="mb-2">Reset password untuk <strong>@${user.username}</strong>:</p>
            <input type="password" id="rp-new-password" class="form-control mb-2" placeholder="Password baru (min. 6 karakter)" autocomplete="new-password">
            <div id="rp-error" class="text-danger small d-none"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button type="button" class="btn btn-warning btn-sm fw-bold" onclick="PengaturanModule.commitResetPassword(${userId})">
              <i class="bi bi-check me-1"></i>Reset
            </button>
          </div>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('modal-reset-pwd');
    new bootstrap.Modal(modalEl).show();
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
  },

  commitResetPassword(userId) {
    const pwd = document.getElementById('rp-new-password')?.value || '';
    const errEl = document.getElementById('rp-error');
    if (pwd.length < 6) {
      if (errEl) { errEl.textContent = 'Password minimal 6 karakter!'; errEl.classList.remove('d-none'); }
      return;
    }
    const user = DB.getById('users', userId);
    DB.update('users', userId, { password: pwd });
    DB.logActivity('Reset Password', 'users', `Password untuk "@${user?.username}" berhasil direset oleh admin.`);
    bootstrap.Modal.getInstance(document.getElementById('modal-reset-pwd'))?.hide();
    App.showToast('Password Direset', `Password pengguna "@${user?.username}" berhasil diperbarui.`, 'success');
  },

  deleteUser(userId) {
    const currentUser = Auth.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      App.showToast('Tidak Bisa', 'Anda tidak dapat menghapus akun yang sedang aktif digunakan!', 'warning');
      return;
    }
    const user = DB.getById('users', userId);
    if (!user) return;
    App.showConfirm('Hapus User', `Hapus pengguna "@${user.username}" (${user.nama_lengkap})? Tindakan ini tidak dapat dibatalkan.`, () => {
      DB.delete('users', userId, `Menghapus pengguna "@${user.username}"`);
      App.showToast('User Dihapus', `Pengguna "@${user.username}" berhasil dihapus.`, 'info');
      this.renderUsers();
    });
  },

  renderAuditLogs() {
    const tbody = document.getElementById('audit-log-table-body');
    if (!tbody) return;

    const searchInput = document.getElementById('search-audit-log');
    if (searchInput && !searchInput.hasAttribute('data-bound')) {
      searchInput.addEventListener('input', () => this.renderAuditLogs());
      searchInput.setAttribute('data-bound', 'true');
    }

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    let logs = DB.getAll('audit_logs');

    if (searchTerm) {
      logs = logs.filter(l => 
        (l.username || '').toLowerCase().includes(searchTerm) || 
        (l.aksi || '').toLowerCase().includes(searchTerm) ||
        (l.deskripsi || '').toLowerCase().includes(searchTerm)
      );
    }

    logs = logs.slice(0, 50);

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-muted">Belum ada catatan aktivitas sistem atau tidak ditemukan.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map((l) => {
      const date = new Date(l.created_at);
      const timeStr = isNaN(date.getTime()) ? '-' : `${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID')}`;

      return `
        <tr>
          <td><small class="text-muted"><i class="bi bi-clock me-1"></i>${timeStr}</small></td>
          <td><strong>@${l.username}</strong></td>
          <td>
             <span class="badge bg-light border text-dark me-1">${l.aksi}</span>
             <small class="text-secondary">${l.deskripsi}</small>
          </td>
        </tr>
      `;
    }).join('');
  },

  downloadJSONBackup() {
    const progressBar = document.getElementById('backup-progress-container');
    const bar = document.getElementById('backup-progress-bar');
    
    if (progressBar && bar) {
      progressBar.classList.remove('d-none');
      bar.style.width = '0%';
      bar.innerText = 'Menyiapkan Data... 0%';
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 10;
        if (progress > 100) progress = 100;
        bar.style.width = `${progress}%`;
        bar.innerText = `Menyiapkan Data... ${progress}%`;
        
        if (progress === 100) {
          clearInterval(interval);
          setTimeout(() => {
             ExportUtils.exportJSONBackup();
             progressBar.classList.add('d-none');
             App.showToast('Sukses', 'Backup JSON berhasil diunduh.', 'success');
          }, 500);
        }
      }, 200);
    } else {
      ExportUtils.exportJSONBackup();
    }
  },

  downloadSQLBackup() {
    ExportUtils.downloadSQLDump();
  },

  downloadExcelFullBackup() {
    LaporanModule.exportMultiSheetMasterExcel();
  },

  saveAdvancedConfig() {
    const timezone = document.getElementById('adv-timezone')?.value;
    const format = document.getElementById('adv-date-format')?.value;
    const language = document.getElementById('adv-language')?.value;
    const timeout = document.getElementById('adv-session-timeout')?.value;

    const secStrongPwd = document.getElementById('sec-strong-pwd')?.checked;
    const secForceLogout = document.getElementById('sec-force-logout')?.checked;
    const secApiLock = document.getElementById('sec-api-lock')?.checked;

    DB.state.konfigurasi_sistem = {
      timezone, format, language, timeout,
      security: {
        strong_password: secStrongPwd,
        force_logout: secForceLogout,
        api_lock: secApiLock
      }
    };
    DB.logActivity('Ubah Konfigurasi Lanjutan', 'pengaturan', 'Menyimpan preferensi sistem dan kebijakan keamanan');
    DB.saveState();
    App.showToast('Sukses', 'Konfigurasi lanjutan berhasil disimpan.', 'success');
  },

  saveIntegration(type) {
    if (!DB.state.integrasi) DB.state.integrasi = {};
    
    if (type === 'smtp') {
      DB.state.integrasi.smtp = {
        host: document.getElementById('int-smtp-host')?.value,
        port: document.getElementById('int-smtp-port')?.value,
        sec: document.getElementById('int-smtp-sec')?.value,
        user: document.getElementById('int-smtp-user')?.value,
      };
      DB.logActivity('Ubah Integrasi', 'pengaturan', 'Memperbarui konfigurasi SMTP Email');
      App.showToast('Sukses', 'Konfigurasi SMTP Email disimpan.', 'success');
    } else if (type === 'wa') {
      DB.state.integrasi.wa = {
        url: document.getElementById('int-wa-url')?.value,
        active: document.getElementById('int-wa-active')?.checked,
      };
      DB.logActivity('Ubah Integrasi', 'pengaturan', 'Memperbarui konfigurasi WhatsApp Gateway');
      App.showToast('Sukses', 'Konfigurasi WhatsApp Gateway disimpan.', 'success');
    }
    DB.saveState();
  },

  resetDatabase() {
    App.showConfirm('Peringatan Reset', 'PERINGATAN: Apakah Anda yakin ingin mereset seluruh database kembali ke data bawaan awal? Seluruh perubahan baru akan ditimpa.', () => {
      DB.resetToInitial();
      App.showToast('Database Direset', 'Database telah dikembalikan ke data awal demo.', 'warning');
      setTimeout(() => location.reload(), 500);
    });
  },

  // ==========================================================================
  // GOOGLE DRIVE SYNC INTEGRATION
  // ==========================================================================
  renderGDriveSettings() {
    if (typeof window.GoogleDriveSync !== 'undefined') {
      window.GoogleDriveSync.renderUI();
    }
  },

  // ==========================================================================
  // INTEGRASI BACKEND & SYNC CONTROLLER
  // ==========================================================================
  renderBackendSettings() {
    const urlInput = document.getElementById('backend-api-url');
    if (urlInput && window.Api) {
      urlInput.value = window.Api.getBaseUrl();
    }
    this.updateBackendStatusUI();
  },

  async updateBackendStatusUI() {
    const badge = document.getElementById('backend-status-badge');
    const connText = document.getElementById('backend-conn-text');
    const dbText = document.getElementById('backend-db-text');
    const latText = document.getElementById('backend-latency-text');
    const jwtText = document.getElementById('backend-jwt-text');
    const queueBadge = document.getElementById('sync-queue-badge');
    const queueCountText = document.getElementById('sync-queue-count-text');

    const token = localStorage.getItem('jwt_token') || '';
    if (jwtText) {
      jwtText.textContent = token ? `✓ Aktif (${token.slice(0, 14)}...)` : 'Belum Login Online';
      jwtText.className = token ? 'small text-success fw-bold' : 'small text-muted';
    }

    if (window.SyncQueue) {
      const ops = await window.SyncQueue.getAllOperations();
      const count = ops.length;
      if (queueBadge) queueBadge.textContent = `${count} Antrean`;
      if (queueCountText) queueCountText.textContent = `${count} Perubahan Tertunda`;
    }

    if (!window.Api) return;

    const start = performance.now();
    const res = await window.Api.checkHealth();
    const latency = Math.round(performance.now() - start);

    if (res.connected) {
      if (badge) {
        badge.className = 'badge bg-success';
        badge.textContent = '● Server Online';
      }
      if (connText) {
        connText.innerHTML = '<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Terhubung</span>';
      }
      if (dbText) {
        const isDbOk = res.data && res.data.database === 'connected';
        dbText.innerHTML = isDbOk
          ? '<span class="text-success fw-bold"><i class="bi bi-database-check me-1"></i>MySQL Terhubung (db_guru_sd)</span>'
          : `<span class="text-warning fw-bold"><i class="bi bi-database-exclamation me-1"></i>${res.data ? res.data.database : 'Disambungkan'}</span>`;
      }
      if (latText) {
        latText.textContent = `${latency} ms`;
      }
    } else {
      if (badge) {
        badge.className = 'badge bg-danger';
        badge.textContent = '● Server Offline';
      }
      if (connText) {
        connText.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-x-circle-fill me-1"></i>Tidak Terhubung</span>';
      }
      if (dbText) {
        dbText.innerHTML = '<span class="text-muted">-</span>';
      }
      if (latText) {
        latText.textContent = '-';
      }
    }
  },

  async testServerConnection() {
    const btn = document.getElementById('btn-test-server-conn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menguji...';
    }

    try {
      const urlInput = document.getElementById('backend-api-url');
      if (urlInput && window.Api) {
        window.Api.setBaseUrl(urlInput.value.trim());
      }

      const start = performance.now();
      const res = await window.Api.checkHealth();
      const latency = Math.round(performance.now() - start);

      if (res.connected) {
        App.showToast('Koneksi Berhasil', `Server Backend terhubung aktif (${latency} ms). Database: ${res.data?.database || 'OK'}`, 'success');
      } else {
        App.showToast('Koneksi Gagal', `Tidak dapat menghubungi server: ${res.error}`, 'danger');
      }

      await this.updateBackendStatusUI();
    } catch (e) {
      App.showToast('Gagal', `Error: ${e.message}`, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-broadcast me-1"></i>Uji Koneksi';
      }
    }
  },

  saveBackendConfig() {
    const urlInput = document.getElementById('backend-api-url');
    if (!urlInput || !window.Api) return;

    const newUrl = urlInput.value.trim();
    window.Api.setBaseUrl(newUrl);
    App.showToast('Konfigurasi Disimpan', `Alamat Backend API disetel ke ${newUrl}`, 'success');
    this.updateBackendStatusUI();
  },

  handlePushAll() {
    App.showConfirm(
      'Konfirmasi Dorong Data (Push All)',
      'Apakah Anda yakin ingin mengirim seluruh data lokal ke Database Server? Data di server akan diperbarui sesuai state lokal.',
      async () => {
        const btn = document.getElementById('btn-push-all');
        if (btn) btn.disabled = true;

        try {
          App.showToast('Menyinkronkan...', 'Mengirim seluruh koleksi data ke server...', 'info');
          await DB.pushAllToBackend();
          App.showToast('Sinkronisasi Berhasil', 'Seluruh data berhasil didorong dan disimpan ke database server.', 'success');
          this.updateBackendStatusUI();
        } catch (err) {
          App.showToast('Sinkronisasi Gagal', err.message, 'danger');
        } finally {
          if (btn) btn.disabled = false;
        }
      },
      'Ya, Kirim ke Server',
      'btn-success'
    );
  },

  handlePullAll() {
    App.showConfirm(
      'Konfirmasi Tarik Data (Pull All)',
      'Apakah Anda yakin ingin mengambil seluruh salinan data terkini dari Server? Data lokal akan diperbarui mengikuti server.',
      async () => {
        const btn = document.getElementById('btn-pull-all');
        if (btn) btn.disabled = true;

        try {
          App.showToast('Menyinkronkan...', 'Mengunduh seluruh data dari database server...', 'info');
          await DB.pullAllFromBackend();
          App.showToast('Berhasil', 'Seluruh data lokal berhasil diperbarui dari database server.', 'success');
          App.reRenderCurrentView();
          this.updateBackendStatusUI();
        } catch (err) {
          App.showToast('Gagal Tarik Data', err.message, 'danger');
        } finally {
          if (btn) btn.disabled = false;
        }
      },
      'Ya, Ambil dari Server',
      'btn-primary'
    );
  },

  async handleClearSyncQueue() {
    if (window.SyncQueue) {
      await window.SyncQueue.clearQueue();
      App.showToast('Antrean Dikosongkan', 'Seluruh antrean operasi offline telah dibersihkan.', 'info');
      this.updateBackendStatusUI();
    }
  },

  initSyncWatcher() {
    // Listen to SyncQueue changes
    if (window.SyncQueue) {
      window.SyncQueue.subscribe((info) => {
        const queueBadge = document.getElementById('sync-queue-badge');
        const queueCountText = document.getElementById('sync-queue-count-text');
        if (queueBadge) queueBadge.textContent = `${info.pendingCount} Antrean`;
        if (queueCountText) queueCountText.textContent = `${info.pendingCount} Perubahan Tertunda`;
        this.updateTopbarSyncStatus(info);
      });
    }

    // Listen to API status changes
    if (window.Api) {
      window.Api.subscribe((ev) => {
        this.updateBackendStatusUI();
        this.updateTopbarSyncStatus();
      });
    }

    // Topbar Sync button click handler
    const topbarBtn = document.getElementById('btn-topbar-sync');
    if (topbarBtn) {
      topbarBtn.addEventListener('click', async () => {
        const spinner = document.getElementById('topbar-sync-spinner');
        const icon = document.getElementById('topbar-sync-icon');
        const text = document.getElementById('topbar-sync-text');

        if (spinner) spinner.classList.remove('d-none');
        if (icon) icon.classList.add('d-none');
        if (text) text.textContent = 'Menyinkronkan...';

        try {
          if (window.SyncQueue) await window.SyncQueue.processQueue();
          if (typeof DB._syncWithBackend === 'function') await DB._syncWithBackend();
          App.showToast('Status Sinkronisasi', 'Sinkronisasi dengan server selesai diperiksa.', 'info');
        } catch (e) {
          console.warn('Sync click error:', e);
        } finally {
          this.updateTopbarSyncStatus();
        }
      });
    }

    // Initial check
    setTimeout(() => this.updateTopbarSyncStatus(), 800);
  },

  updateTopbarSyncStatus(queueInfo = null) {
    const spinner = document.getElementById('topbar-sync-spinner');
    const icon = document.getElementById('topbar-sync-icon');
    const text = document.getElementById('topbar-sync-text');
    const btn = document.getElementById('btn-topbar-sync');

    if (!icon || !text) return;

    if (queueInfo && queueInfo.isProcessing) {
      if (spinner) spinner.classList.remove('d-none');
      icon.classList.add('d-none');
      text.textContent = 'Sinkronisasi...';
      return;
    }

    if (spinner) spinner.classList.add('d-none');
    icon.classList.remove('d-none');

    const isConnected = window.Api && window.Api.isServerConnected;
    const isOnline = navigator.onLine;

    if (isConnected) {
      icon.className = 'bi bi-circle-fill text-success';
      text.textContent = 'Server Online';
      if (btn) btn.className = 'btn btn-sm btn-outline-success d-flex align-items-center gap-1 px-2 py-1';
    } else if (isOnline) {
      icon.className = 'bi bi-circle-fill text-warning';
      text.textContent = 'Server Offline (Lokal)';
      if (btn) btn.className = 'btn btn-sm btn-outline-warning d-flex align-items-center gap-1 px-2 py-1';
    } else {
      icon.className = 'bi bi-circle-fill text-danger';
      text.textContent = 'Mode Offline';
      if (btn) btn.className = 'btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 px-2 py-1';
    }
  }
};
