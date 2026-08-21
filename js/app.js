/**
 * ============================================================================
 * MAIN APPLICATION ENTRY POINT & SPA ROUTER
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * 
 * Pengendali utama alur aplikasi (App Orchestrator) yang menghubungkan modul-modul
 * utilitas (ThemeUtil, ToastUtil, RouterUtil), otentikasi (Auth), modul fitur,
 * dan manajemen state reaktif (DB).
 * ============================================================================
 */

/**
 * Objek Utama Aplikasi (Façade Pattern)
 * @namespace App
 */
const App = {
  /**
   * ID Tampilan (View) yang sedang aktif saat ini.
   * @type {string}
   */
  currentView: 'view-dashboard',

  /**
   * Mengembalikan tema tampilan yang sedang aktif ('light' atau 'dark').
   * @returns {string}
   */
  get theme() {
    return typeof ThemeUtil !== 'undefined' ? ThemeUtil.currentTheme : 'light';
  },

  /**
   * Inisialisasi awal seluruh komponen aplikasi setelah DOM siap.
   */
  async init() {
    console.log('Inisialisasi Aplikasi Database Guru SD Negeri Sumber Waru 2...');

    // 1. Inisialisasi Tema (Light/Dark Mode)
    this.initTheme();

    // 2. Inisialisasi Otentikasi & Pengaturan Akses Peran
    if (typeof Auth !== 'undefined') {
      await Auth.init();
    }

    // 3. Daftarkan Listener Event Navigasi Global
    this.bindNavigation();

    // 4. Inisialisasi Modul-Modul Fitur Utama
    this.initModules();

    // 5. Daftarkan Service Worker PWA untuk Fitur Offline & Instalasi
    this.registerPWA();

    // 6. Inisialisasi Listener Pencarian Global Topbar
    this.initGlobalSearch();

    // 7. Auto-Sync Reactivity (Render ulang tampilan aktif jika data di DB berubah)
    if (typeof DB !== 'undefined') {
      DB.subscribe(() => {
        this.reRenderCurrentView();
      });
    }
  },

  /**
   * Menjalankan fungsi inisialisasi pada seluruh modul fitur secara aman.
   */
  initModules() {
    const modules = [
      typeof DashboardModule !== 'undefined' && DashboardModule,
      typeof GuruModule !== 'undefined' && GuruModule,
      typeof PendidikanModule !== 'undefined' && PendidikanModule,
      typeof SertifikasiModule !== 'undefined' && SertifikasiModule,
      typeof KepegawaianModule !== 'undefined' && KepegawaianModule,
      typeof JadwalModule !== 'undefined' && JadwalModule,
      typeof BebanMengajarModule !== 'undefined' && BebanMengajarModule,
      typeof AbsensiModule !== 'undefined' && AbsensiModule,
      typeof PKGModule !== 'undefined' && PKGModule,
      typeof PrestasiModule !== 'undefined' && PrestasiModule,
      typeof PelatihanModule !== 'undefined' && PelatihanModule,
      typeof DokumenModule !== 'undefined' && DokumenModule,
      typeof LaporanModule !== 'undefined' && LaporanModule,
      typeof PengaturanModule !== 'undefined' && PengaturanModule
    ];

    modules.forEach(mod => {
      if (mod && typeof mod.init === 'function') {
        try {
          mod.init();
        } catch (err) {
          console.error(`Gagal menginisialisasi modul:`, err);
        }
      }
    });
  },

  /**
   * Inisialisasi pengatur tema tampilan.
   */
  initTheme() {
    if (typeof ThemeUtil !== 'undefined') {
      ThemeUtil.init();
    }
  },

  /**
   * Mengatur tema tampilan aplikasi secara eksplisit.
   * @param {'light'|'dark'} theme - Nama tema target.
   */
  setTheme(theme) {
    if (typeof ThemeUtil !== 'undefined') {
      ThemeUtil.setTheme(theme);
    }
  },

  /**
   * Mendaftarkan event handler navigasi sidebar, tombol mobile, otentikasi, dan simulasi peran.
   */
  bindNavigation() {
    // Menu Sidebar Links
    document.querySelectorAll('.nav-menu-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-view');
        if (targetView) {
          // Guard: Cek hak akses berdasarkan peran akun yang login
          if (typeof Auth !== 'undefined' && !Auth.canAccessView(targetView)) {
            this.showToast('Akses Ditolak', 'Anda tidak memiliki izin untuk mengakses halaman ini.', 'danger');
            return;
          }
          this.switchView(targetView);

          // Tutup sidebar mobile jika sedang terbuka
          const sidebar = document.getElementById('sidebar');
          const backdrop = document.querySelector('.sidebar-backdrop');
          if (sidebar && sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
            if (backdrop) backdrop.classList.remove('show');
          }
        }
      });
    });

    // Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('btn-mobile-sidebar');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        if (backdrop) backdrop.classList.toggle('show');
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('show');
        backdrop.classList.remove('show');
      });
    }

    // Listener Tombol Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        App.showConfirm('Konfirmasi Logout', 'Apakah Anda yakin ingin keluar dari sistem?', () => {
          if (typeof Auth !== 'undefined') Auth.logout();
        }, 'Ya, Keluar', 'btn-warning');
      });
    }


    // Listener Ubah Password di Sidebar Profil
    const btnChangePwd = document.getElementById('btn-change-password-sidebar');
    if (btnChangePwd && typeof Auth !== 'undefined') {
      btnChangePwd.addEventListener('click', () => Auth.showChangePasswordModal());
    }

    // Listener Selector Simulasi Peran Pengguna di Topbar
    const roleSelect = document.getElementById('select-simulasi-role');
    if (roleSelect && typeof DB !== 'undefined' && typeof Auth !== 'undefined') {
      roleSelect.addEventListener('change', (e) => {
        const targetRole = e.target.value;
        const users = DB.getAll('users');
        const targetUser = users.find(u => u.role === targetRole);
        if (targetUser) {
          // Perbarui currentUser pada Auth dan simpan session baru
          Auth.currentUser = { ...targetUser };
          Auth._refreshSession();
          // Terapkan izin antarmuka untuk peran baru
          Auth.applyUIPermissions();
          // Jika view saat ini tidak diizinkan untuk peran baru, alihkan ke Dashboard
          if (!Auth.canAccessView(this.currentView)) {
            this.switchView('view-dashboard');
          } else {
            this.reRenderCurrentView();
          }
          DB.logActivity('Simulasi Peran', 'users', `Beralih ke peran ${targetRole} (${targetUser.nama_lengkap})`);
          this.showToast('Ganti Peran', `Beralih ke: ${targetRole.toUpperCase()} — ${targetUser.nama_lengkap}`, 'info');
        }
      });
    }
  },

  /**
   * Berpindah ke antarmuka halaman lain (Single Page Application).
   * @param {string} viewId - ID dari elemen view target (contoh: 'view-guru').
   */
  switchView(viewId) {
    if (typeof RouterUtil !== 'undefined') {
      RouterUtil.switchView(viewId);
    }
  },

  /**
   * Memperbarui/merender ulang tampilan modul aktif saat ini secara otomatis.
   */
  reRenderCurrentView() {
    if (typeof RouterUtil !== 'undefined') {
      RouterUtil.reRenderCurrentView(this.currentView);
    }
  },

  /**
   * Menyiapkan handler pencarian cepat di topbar yang langsung mengarahkan ke tabel Data Master Guru.
   */
  initGlobalSearch() {
    const globalInput = document.getElementById('global-search-input');
    if (!globalInput) return;

    globalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && globalInput.value.trim()) {
        const query = globalInput.value.trim();
        this.switchView('view-guru');

        const guruSearch = document.getElementById('search-guru-input');
        if (guruSearch) {
          guruSearch.value = query;
          if (typeof GuruModule !== 'undefined') {
            GuruModule.searchTerm = query.toLowerCase();
            GuruModule.renderTable();
          }
        }
      }
    });
  },

  /**
   * Menampilkan pesan notifikasi melayang (Toast Notification).
   * 
   * @param {string} title - Judul notifikasi.
   * @param {string} message - Pesan/deskripsi notifikasi.
   * @param {'primary'|'success'|'danger'|'warning'|'info'} [type='primary'] - Jenis styling visual notifikasi.
   */
  showToast(title, message, type = 'primary') {
    if (typeof ToastUtil !== 'undefined') {
      ToastUtil.show(title, message, type);
    }
  },

  /**
   * Menampilkan Modal Konfirmasi Dinamis bergaya Bootstrap (pengganti native confirm).
   * 
   * @param {string} title - Judul konfirmasi.
   * @param {string} message - Pesan konfirmasi.
   * @param {function} onConfirm - Callback saat tombol konfirmasi diklik.
   * @param {string} [confirmText='Ya, Lanjutkan'] - Teks tombol konfirmasi.
   * @param {string} [btnClass='btn-danger'] - Class bootstrap untuk tombol konfirmasi.
   */
  showConfirm(title, message, onConfirm, confirmText = 'Ya, Hapus', btnClass = 'btn-danger') {
    // Buat elemen modal jika belum ada
    let modalEl = document.getElementById('dynamic-confirm-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'dynamic-confirm-modal';
      modalEl.className = 'modal fade';
      modalEl.setAttribute('tabindex', '-1');
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content shadow">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold" id="confirm-modal-title">Konfirmasi</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center pt-3 pb-4">
              <i class="bi bi-exclamation-circle text-warning mb-3" style="font-size: 3rem;"></i>
              <p class="mb-0 text-dark" id="confirm-modal-message">Apakah Anda yakin?</p>
            </div>
            <div class="modal-footer border-0 justify-content-center bg-light">
              <button type="button" class="btn btn-secondary px-3" data-bs-dismiss="modal">Batal</button>
              <button type="button" class="btn px-4" id="confirm-modal-btn">Ya</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    
    const confirmBtn = document.getElementById('confirm-modal-btn');
    confirmBtn.className = `btn px-4 ${btnClass}`;
    confirmBtn.textContent = confirmText;

    const modalInstance = new bootstrap.Modal(modalEl);
    
    // Ganti handler klik sebelumnya (penting karena elemen direuse)
    confirmBtn.onclick = () => {
      modalInstance.hide();
      if (typeof onConfirm === 'function') onConfirm();
    };

    modalInstance.show();
  },

  /**
   * Menghasilkan templat HTML Kop Surat Resmi Sekolah untuk cetakan laporan A4.
   * @returns {string} String HTML Kop Surat.
   */
  getKopSuratLaporan() {
    const appSettings = (typeof DB !== 'undefined' && DB.state.pengaturan_aplikasi) || {};
    const logoSrc = appSettings.logo_sekolah || 'assets/logo-placeholder.png';
    const profil = (typeof DB !== 'undefined' && DB.state.profil_sekolah) || {};
    // Gunakan field yang benar sesuai INITIAL_STATE
    const namaSekolah = profil.nama_sekolah || profil.nama || 'SD NEGERI SUMBER WARU 2';
    const alamat = profil.alamat_lengkap || profil.alamat || 'Jl. Pendidikan No. 45 Desa Sumber Waru, Kec. Waru, Kab. Pamekasan (67291)';
    const email = profil.email || 'sdnsumberwaru2@kemdikbud.go.id';
    const kecamatan = profil.kecamatan || 'Waru';
    const kabupaten = profil.kabupaten_kota || 'Kabupaten Pamekasan';

    return `
      <div class="kop-surat-resmi" style="display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
        <div class="kop-logo" style="width: 100px; text-align: center;">
          <img src="${logoSrc}" style="max-width: 90px; max-height: 90px; object-fit: contain;" alt="Logo">
        </div>
        <div class="kop-text" style="flex-grow: 1; text-align: center;">
          <h4 style="margin: 0; font-size: 18px; font-weight: normal;">PEMERINTAH KABUPATEN PAMEKASAN</h4>
          <h4 style="margin: 0; font-size: 20px; font-weight: bold;">DINAS PENDIDIKAN DAN KEBUDAYAAN</h4>
          <h3 style="margin: 5px 0; font-size: 24px; font-weight: bold;">${Helpers.escapeHTML(namaSekolah.toUpperCase())}</h3>
          <p style="margin: 0; font-size: 13px;">${Helpers.escapeHTML(alamat)} | Email: ${Helpers.escapeHTML(email)}</p>
        </div>
        <div style="width: 100px;"></div>
      </div>
    `;
  },

  /**
   * Menghasilkan templat HTML Tanda Tangan Kepala Sekolah dinamis untuk cetakan cetak A4.
   * 
   * @param {string} tanggal - String tanggal cetak (contoh: "15 Agustus 2026").
   * @returns {string} String HTML Blok Tanda Tangan.
   */
  getTandaTanganKS(tanggal) {
    const appSettings = (typeof DB !== 'undefined' && DB.state.pengaturan_aplikasi) || {};
    const ttdSrc = appSettings.ttd_kepala_sekolah;
    const profil = (typeof DB !== 'undefined' && DB.state.profil_sekolah) || {};
    // Field yang benar sesuai INITIAL_STATE
    const namaKS = profil.nama_kepala_sekolah || profil.nama_kepsek || 'FAUZAN, S.Pd.SD';
    const nipKS = profil.nip_kepala_sekolah || profil.nip_kepsek || '19720602 199605 1 001';

    let ttdHTML = '';
    if (ttdSrc && ttdSrc !== 'assets/ttd-placeholder.png') {
      ttdHTML = `<img src="${ttdSrc}" style="max-width: 150px; max-height: 80px; margin: 5px 0;" alt="Tanda Tangan">`;
    } else {
      ttdHTML = `<div style="height: 80px;"></div>`;
    }

    return `
      <div style="width: 300px; text-align: left;">
        <p style="margin-bottom: 5px;">Pamekasan, ${Helpers.escapeHTML(tanggal)}</p>
        <p style="margin-bottom: 5px;">Kepala Sekolah</p>
        ${ttdHTML}
        <p style="margin-bottom: 0; font-weight: bold; text-decoration: underline;">${Helpers.escapeHTML(namaKS)}</p>
        <p style="margin-top: 2px;">NIP. ${Helpers.escapeHTML(nipKS)}</p>
      </div>
    `;
  },

  /**
   * Mendaftarkan Service Worker Progressive Web App (PWA) jika didukung peramban.
   */
  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(
          reg => console.log('ServiceWorker SDN Sumber Waru 2 aktif:', reg.scope),
          err => console.log('ServiceWorker gagal:', err)
        );
      });
    }
  }
};

// Bootstrap Aplikasi saat DOM Ready & Data IndexedDB telah dimuat
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof DB !== 'undefined' && typeof DB.loadState === 'function') {
    await DB.loadState();
  }
  await App.init();
});
