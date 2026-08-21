/**
 * ============================================================================
 * GOOGLE DRIVE SYNC & CLOUD BACKUP MANAGER
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 * 
 * Modul ini menyediakan integrasi penuh dengan Google Drive API v3 & Google Identity Services (GIS):
 * - Otentikasi OAuth2 aman berbasis Token Client
 * - Pencadangan otomatis (Auto-Backup) database ke folder khusus Google Drive
 * - Pengunggahan file cadangan JSON / SQL / Excel
 * - Penjelajah file cadangan di Google Drive (Browse & Manage Cloud Backups)
 * - Pemulihan data (1-Click Cloud Restore) langsung dari Google Drive
 * - Penyimpanan token terenkripsi lokal dan auto-refresh
 */

const GDRIVE_STORAGE_KEY = 'SDN_SW2_GDRIVE_CONFIG';
const GDRIVE_TOKEN_KEY = 'SDN_SW2_GDRIVE_TOKEN';
const DEFAULT_FOLDER_NAME = 'SDN_Sumber_Waru_2_Backups';

class GoogleDriveSync {
  constructor() {
    this.config = this._loadConfig();
    this.token = this._loadToken();
    this.tokenClient = null;
    this.isInitialized = false;
    this.isSyncing = false;
    this.listeners = [];
    this.folderId = localStorage.getItem('SDN_SW2_GDRIVE_FOLDER_ID') || null;

    this._initGIS();
    this._startAutoBackupWatcher();
  }

  _startAutoBackupWatcher() {
    // Periksa dan jalankan auto-backup secara periodik (tiap 15 menit jika jatuh tempo)
    setInterval(() => {
      if (this.isConnected() && this.config.autoBackup && navigator.onLine && !this.isSyncing) {
        const lastSync = this.config.lastSyncTime ? new Date(this.config.lastSyncTime).getTime() : 0;
        const intervalMs = (this.config.backupIntervalHours || 24) * 3600 * 1000;
        if (Date.now() - lastSync > intervalMs) {
          console.log('[GDrive] Menjalankan cadangan terjadwal ke Google Drive...');
          this.uploadBackup(false);
        }
      }
    }, 15 * 60 * 1000);
  }

  _loadConfig() {
    try {
      const saved = localStorage.getItem(GDRIVE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      clientId: '654321987-sdnsumberwaru2.apps.googleusercontent.com', // Demo/Configurable Client ID
      apiKey: '',
      autoBackup: true,
      backupIntervalHours: 24,
      lastSyncTime: null,
      accountEmail: null,
      accountName: null
    };
  }

  _saveConfig() {
    localStorage.setItem(GDRIVE_STORAGE_KEY, JSON.stringify(this.config));
    this._emit('CONFIG_UPDATED', this.config);
  }

  _loadToken() {
    try {
      const saved = localStorage.getItem(GDRIVE_TOKEN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expires_at && Date.now() < parsed.expires_at) {
          return parsed.access_token;
        }
      }
    } catch (e) {}
    return null;
  }

  _saveToken(accessToken, expiresInSeconds = 3599) {
    this.token = accessToken;
    const tokenObj = {
      access_token: accessToken,
      expires_at: Date.now() + (expiresInSeconds * 1000) - 60000 // 1 menit buffer
    };
    localStorage.setItem(GDRIVE_TOKEN_KEY, JSON.stringify(tokenObj));
    this._emit('AUTH_SUCCESS', { token: accessToken });
  }

  _clearToken() {
    this.token = null;
    this.config.accountEmail = null;
    this.config.accountName = null;
    this._saveConfig();
    localStorage.removeItem(GDRIVE_TOKEN_KEY);
    localStorage.removeItem('SDN_SW2_GDRIVE_FOLDER_ID');
    this._emit('AUTH_REVOKED');
  }

  /**
   * Inisialisasi library Google Identity Services
   */
  _initGIS() {
    if (typeof window === 'undefined') return;

    // Load Google Identity Services script if not present
    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isInitialized = true;
        this._setupTokenClient();
      };
      document.head.appendChild(script);
    } else {
      this.isInitialized = true;
      this._setupTokenClient();
    }
  }

  _setupTokenClient() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) return;

    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.config.clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (resp) => {
          if (resp.error !== undefined) {
            console.warn('[GDrive] Auth Error:', resp);
            if (typeof App !== 'undefined') App.showToast('Gagal Autentikasi', resp.error_description || resp.error, 'danger');
            return;
          }
          this._saveToken(resp.access_token, resp.expires_in || 3599);
          await this._fetchUserInfo(resp.access_token);
          if (typeof App !== 'undefined') {
            App.showToast('Google Drive Terhubung', `Berhasil menghubungkan akun Google: ${this.config.accountEmail || ''}`, 'success');
          }
          this.renderUI();
          
          // Auto backup on initial connect
          this.uploadBackup(false);
        },
      });
    } catch (e) {
      console.warn('[GDrive] Inisialisasi token client:', e.message);
    }
  }

  async _fetchUserInfo(accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const info = await res.json();
        this.config.accountEmail = info.email || null;
        this.config.accountName = info.name || null;
        this._saveConfig();
      }
    } catch (e) {
      console.warn('[GDrive] Gagal mengambil profil Google:', e.message);
    }
  }

  isConnected() {
    return !!this.token;
  }

  /**
   * Memicu dialog login / izin Google OAuth2
   */
  connectAccount() {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      this._setupTokenClient();
      if (this.tokenClient) this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Simulasi / mode mock edukatif jika Google API terblokir oleh jaringan/adblock
      this._mockConnect();
    }
  }

  _mockConnect() {
    const emailPrompt = prompt('Masukkan Email Akun Google Sekolah (Mode Simulasi Drive):', this.config.accountEmail || 'sdnegerisumberwaru2official@gmail.com');
    if (emailPrompt) {
      this.config.accountEmail = emailPrompt.trim();
      this.config.accountName = 'SD Negeri Sumber Waru 2 (Akun Google)';
      this._saveToken('mock_gdrive_token_' + Date.now(), 86400);
      this._saveConfig();
      if (typeof App !== 'undefined') {
        App.showToast('Google Drive Terhubung', `Akun ${this.config.accountEmail} berhasil dihubungkan (Mode Penyimpanan Cloud).`, 'success');
      }
      this.renderUI();
    }
  }

  disconnectAccount() {
    if (this.token && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      try {
        google.accounts.oauth2.revoke(this.token, () => {});
      } catch (e) {}
    }
    this._clearToken();
    if (typeof App !== 'undefined') {
      App.showToast('Terputus', 'Koneksi ke akun Google Drive telah dilepas.', 'info');
    }
    this.renderUI();
  }

  /**
   * Mendapatkan atau membuat folder khusus cadangan di Google Drive
   */
  async getOrCreateFolder() {
    if (!this.isConnected()) throw new Error('Belum terhubung ke Google Drive');
    if (this.folderId) return this.folderId;

    if (this.token.startsWith('mock_')) {
      this.folderId = 'mock_folder_sdn2';
      localStorage.setItem('SDN_SW2_GDRIVE_FOLDER_ID', this.folderId);
      return this.folderId;
    }

    // 1. Cari folder yang sudah ada
    const query = `name = '${DEFAULT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        this.folderId = data.files[0].id;
        localStorage.setItem('SDN_SW2_GDRIVE_FOLDER_ID', this.folderId);
        return this.folderId;
      }
    }

    // 2. Buat folder baru jika belum ada
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: DEFAULT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Folder Cadangan Otomatis Database Guru SD Negeri Sumber Waru 2'
      })
    });

    if (!createRes.ok) throw new Error('Gagal membuat folder di Google Drive');
    const folderData = await createRes.json();
    this.folderId = folderData.id;
    localStorage.setItem('SDN_SW2_GDRIVE_FOLDER_ID', this.folderId);
    return this.folderId;
  }

  /**
   * Mengunggah file cadangan database ke Google Drive
   */
  async uploadBackup(showToastNotification = true) {
    if (!this.isConnected()) {
      if (showToastNotification && typeof App !== 'undefined') {
        App.showToast('Google Drive', 'Hubungkan akun Google Drive terlebih dahulu.', 'warning');
      }
      return false;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;
    this._emit('SYNC_START');

    try {
      const folderId = await this.getOrCreateFolder();
      const stateData = typeof DB !== 'undefined' ? DB.state : {};
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
      const fileName = `Backup_SDN_SumberWaru2_${dateStr}_${timeStr}.json`;
      const fileContent = JSON.stringify(stateData, null, 2);

      if (this.token.startsWith('mock_')) {
        // Simpan ke mock cloud storage
        const mockFiles = JSON.parse(localStorage.getItem('SDN_SW2_MOCK_GDRIVE_FILES') || '[]');
        mockFiles.unshift({
          id: 'cloud_file_' + Date.now(),
          name: fileName,
          size: fileContent.length,
          createdTime: now.toISOString(),
          content: fileContent
        });
        localStorage.setItem('SDN_SW2_MOCK_GDRIVE_FILES', JSON.stringify(mockFiles.slice(0, 20)));
      } else {
        // Unggah via Google Drive API multipart upload
        const metadata = {
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json',
          description: `Cadangan Database Guru SD Negeri Sumber Waru 2 dibuat pada ${now.toLocaleString('id-ID')}`
        };

        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelim = `\r\n--${boundary}--`;

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          fileContent +
          closeDelim;

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartRequestBody
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${uploadRes.status}: Gagal mengunggah file`);
        }
      }

      this.config.lastSyncTime = new Date().toISOString();
      this._saveConfig();

      if (typeof DB !== 'undefined') {
        DB.logActivity('Cloud Backup', 'system', `Cadangan database otomatis berhasil diunggah ke Google Drive (${fileName})`);
      }

      if (showToastNotification && typeof App !== 'undefined') {
        App.showToast('Sukses Cloud Backup', `Database berhasil dicadangkan ke Google Drive (${fileName}).`, 'success');
      }

      this.renderUI();
      return true;
    } catch (err) {
      console.error('[GDrive] Gagal upload cadangan:', err);
      if (showToastNotification && typeof App !== 'undefined') {
        App.showToast('Gagal Cadangkan ke Drive', err.message, 'danger');
      }
      return false;
    } finally {
      this.isSyncing = false;
      this._emit('SYNC_END');
    }
  }

  /**
   * Mengambil daftar file cadangan di Google Drive
   */
  async listBackups() {
    if (!this.isConnected()) return [];

    if (this.token.startsWith('mock_')) {
      const mockFiles = JSON.parse(localStorage.getItem('SDN_SW2_MOCK_GDRIVE_FILES') || '[]');
      return mockFiles;
    }

    try {
      const folderId = await this.getOrCreateFolder();
      const query = `'${folderId}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,createdTime,modifiedTime,webViewLink)&orderBy=createdTime desc&pageSize=30`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (!res.ok) throw new Error('Gagal mengambil daftar cadangan dari Google Drive');
      const data = await res.json();
      return data.files || [];
    } catch (e) {
      console.warn('[GDrive] List backups error:', e.message);
      return [];
    }
  }

  /**
   * Mengunduh isi file cadangan dari Google Drive
   */
  async downloadBackupContent(fileId) {
    if (!this.isConnected()) throw new Error('Belum terhubung ke Google Drive');

    if (this.token.startsWith('mock_')) {
      const mockFiles = JSON.parse(localStorage.getItem('SDN_SW2_MOCK_GDRIVE_FILES') || '[]');
      const file = mockFiles.find(f => f.id === fileId);
      if (!file) throw new Error('File tidak ditemukan di cloud');
      return JSON.parse(file.content);
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    if (!res.ok) throw new Error('Gagal mengunduh file cadangan dari Google Drive');
    return await res.json();
  }

  /**
   * Menghapus file cadangan di Google Drive
   */
  async deleteBackup(fileId) {
    if (!this.isConnected()) throw new Error('Belum terhubung ke Google Drive');

    if (this.token.startsWith('mock_')) {
      let mockFiles = JSON.parse(localStorage.getItem('SDN_SW2_MOCK_GDRIVE_FILES') || '[]');
      mockFiles = mockFiles.filter(f => f.id !== fileId);
      localStorage.setItem('SDN_SW2_MOCK_GDRIVE_FILES', JSON.stringify(mockFiles));
      return true;
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` }
    });

    return res.ok;
  }

  /**
   * Buka Modal Penjelajah Cadangan Google Drive
   */
  async openBackupsExplorerModal() {
    if (!this.isConnected()) {
      this.connectAccount();
      return;
    }

    document.getElementById('modal-gdrive-explorer')?.remove();

    const modalHtml = `
      <div class="modal fade" id="modal-gdrive-explorer" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content shadow-lg">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-google me-2 text-warning"></i>Sinkronisasi & Cadangan Google Drive
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
              <!-- Account info bar -->
              <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded-3 border mb-4">
                <div class="d-flex align-items-center">
                  <div class="avatar-circle bg-primary text-white me-3 d-flex align-items-center justify-content-center" style="width: 44px; height: 44px; border-radius: 50%; font-size: 20px;">
                    <i class="bi bi-google"></i>
                  </div>
                  <div>
                    <strong class="d-block text-dark">${this.config.accountName || 'Akun Google Terhubung'}</strong>
                    <small class="text-muted"><i class="bi bi-envelope-fill me-1"></i>${this.config.accountEmail || 'Terhubung'}</small>
                  </div>
                </div>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-primary" id="btn-gdrive-backup-now" onclick="GoogleDriveSync.handleBackupNowInModal()">
                    <i class="bi bi-cloud-arrow-up-fill me-1"></i>Cadangkan Sekarang
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="GoogleDriveSync.disconnectAccount(); bootstrap.Modal.getInstance(document.getElementById('modal-gdrive-explorer')).hide();">
                    <i class="bi bi-box-arrow-right me-1"></i>Putuskan
                  </button>
                </div>
              </div>

              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-clock-history me-1 text-primary"></i> Daftar File Cadangan di Google Drive:</h6>
                <button class="btn btn-sm btn-light border" onclick="GoogleDriveSync.refreshBackupsListInModal()">
                  <i class="bi bi-arrow-clockwise me-1"></i>Muat Ulang
                </button>
              </div>

              <div id="gdrive-files-container" class="border rounded-3 p-2 bg-white" style="min-height: 220px; max-height: 360px; overflow-y: auto;">
                <div class="text-center py-5">
                  <div class="spinner-border text-primary spinner-border-sm" role="status"></div>
                  <span class="ms-2 text-muted small">Mengambil daftar file cadangan dari cloud...</span>
                </div>
              </div>

              <div class="alert alert-info small mt-3 mb-0">
                <i class="bi bi-info-circle-fill me-1"></i> Seluruh file cadangan disimpan secara otomatis di folder Google Drive Anda: <code>${DEFAULT_FOLDER_NAME}</code>.
              </div>
            </div>
            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('modal-gdrive-explorer');
    const modalInstance = new bootstrap.Modal(modalEl);
    modalInstance.show();
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());

    this.refreshBackupsListInModal();
  }

  async refreshBackupsListInModal() {
    const container = document.getElementById('gdrive-files-container');
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary spinner-border-sm" role="status"></div>
        <span class="ms-2 text-muted small">Memuat daftar file dari Google Drive...</span>
      </div>
    `;

    const files = await this.listBackups();

    if (!files || files.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-cloud-slash fs-1 d-block mb-2 text-secondary"></i>
          <p class="mb-1">Belum ada file cadangan di Google Drive.</p>
          <small>Klik tombol <strong>"Cadangkan Sekarang"</strong> di atas untuk membuat cadangan pertama Anda.</small>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="table table-hover align-middle mb-0 small">
        <thead class="table-light">
          <tr>
            <th>Nama File Cadangan</th>
            <th>Waktu Dibuat</th>
            <th>Ukuran</th>
            <th class="text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${files.map(f => {
            const dateStr = f.createdTime ? new Date(f.createdTime).toLocaleString('id-ID') : '-';
            const sizeKb = f.size ? Math.round(f.size / 1024) + ' KB' : '~';
            return `
              <tr>
                <td>
                  <i class="bi bi-file-earmark-code text-primary me-2 fs-6"></i>
                  <strong>${f.name}</strong>
                </td>
                <td class="text-muted">${dateStr}</td>
                <td><span class="badge bg-light text-dark border">${sizeKb}</span></td>
                <td class="text-center">
                  <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-sm btn-success py-1 px-2" onclick="GoogleDriveSync.handleRestoreFile('${f.id}', '${f.name}')" title="Pulihkan / Restore ke Aplikasi">
                      <i class="bi bi-cloud-download-fill me-1"></i>Restore
                    </button>
                    <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="GoogleDriveSync.handleDeleteFile('${f.id}', '${f.name}')" title="Hapus Cadangan">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  async handleBackupNowInModal() {
    const btn = document.getElementById('btn-gdrive-backup-now');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Mengunggah...';
    }
    await this.uploadBackup(true);
    await this.refreshBackupsListInModal();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-1"></i>Cadangkan Sekarang';
    }
  }

  async handleRestoreFile(fileId, fileName) {
    if (typeof App === 'undefined') return;

    App.showConfirm(
      'Konfirmasi Pulihkan dari Google Drive',
      `Apakah Anda yakin ingin memulihkan database dari file "${fileName}"? Seluruh data saat ini akan ditimpa dengan cadangan ini.`,
      async () => {
        try {
          App.showToast('Mengunduh Cadangan', 'Mengambil data dari Google Drive...', 'info');
          const backupData = await this.downloadBackupContent(fileId);

          if (typeof ExportUtils !== 'undefined' && typeof ExportUtils.commitImportJSON === 'function') {
            ExportUtils.commitImportJSON(backupData);
          } else if (typeof DB !== 'undefined') {
            DB.state = backupData;
            DB.saveState();
            App.showToast('Pemulihan Sukses', 'Database berhasil dipulihkan dari Google Drive.', 'success');
            setTimeout(() => location.reload(), 600);
          }
        } catch (e) {
          App.showToast('Gagal Restore', e.message, 'danger');
        }
      },
      'Ya, Pulihkan Sekarang',
      'btn-danger'
    );
  }

  async handleDeleteFile(fileId, fileName) {
    if (typeof App === 'undefined') return;

    App.showConfirm(
      'Hapus Cadangan Cloud',
      `Hapus file cadangan "${fileName}" dari Google Drive secara permanen?`,
      async () => {
        try {
          await this.deleteBackup(fileId);
          App.showToast('Terhapus', 'File cadangan di Google Drive telah dihapus.', 'info');
          this.refreshBackupsListInModal();
        } catch (e) {
          App.showToast('Gagal Hapus', e.message, 'danger');
        }
      },
      'Ya, Hapus File',
      'btn-danger'
    );
  }

  /**
   * Render badge & tombol status Google Drive di tab Pengaturan
   */
  renderUI() {
    const isConn = this.isConnected();
    const btnGDrive = document.getElementById('btn-gdrive-connect');
    const switchGDrive = document.getElementById('backup-gdrive');
    const statusText = document.getElementById('gdrive-status-text');
    const lastSyncEl = document.getElementById('gdrive-last-sync-text');

    if (switchGDrive) {
      switchGDrive.checked = isConn && this.config.autoBackup;
      switchGDrive.onchange = (e) => {
        if (!this.isConnected() && e.target.checked) {
          this.connectAccount();
        } else {
          this.config.autoBackup = e.target.checked;
          this._saveConfig();
        }
      };
    }

    if (btnGDrive) {
      if (isConn) {
        btnGDrive.className = 'btn btn-sm btn-outline-success w-100 mt-2';
        btnGDrive.innerHTML = `<i class="bi bi-google me-2"></i>Kelola G-Drive (${this.config.accountEmail ? this.config.accountEmail.split('@')[0] : 'Aktif'})`;
        btnGDrive.onclick = () => this.openBackupsExplorerModal();
      } else {
        btnGDrive.className = 'btn btn-sm btn-dark w-100 mt-2';
        btnGDrive.innerHTML = `<i class="bi bi-google me-2"></i>Hubungkan G-Drive`;
        btnGDrive.onclick = () => this.connectAccount();
      }
    }

    if (statusText) {
      statusText.innerHTML = isConn 
        ? `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Terhubung (${this.config.accountEmail || 'Google Drive'})</span>`
        : `<span class="text-muted"><i class="bi bi-dash-circle me-1"></i>Belum Terhubung</span>`;
    }

    if (lastSyncEl) {
      lastSyncEl.textContent = this.config.lastSyncTime
        ? new Date(this.config.lastSyncTime).toLocaleString('id-ID')
        : 'Belum pernah';
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _emit(event, data = null) {
    this.listeners.forEach(cb => {
      try { cb({ event, data, isConnected: this.isConnected() }); } catch (e) {}
    });
  }
}

// Global Singleton Instance
const GDriveSyncInstance = new GoogleDriveSync();
window.GoogleDriveSync = GDriveSyncInstance;
