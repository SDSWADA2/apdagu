/**
 * ============================================================================
 * MAIN APPLICATION CONTROLLER & ROUTER
 * APDAGU Enterprise v2.0
 * Multi-user realtime, Offline-first, Supabase Auth & RLS, RBAC
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Auth } from '../services/auth.js';
import { Realtime } from '../services/realtime.js';
import { Sync } from '../services/sync.js';
import { Theme } from '../utils/theme.js';
import { Toast } from '../utils/toast.js';

// Page Modules
import { DashboardPage } from '../pages/dashboard.js';
import { GuruPage } from '../pages/guru.js';
import { ProfilGuruPage } from '../pages/profil_guru.js';
import { KepegawaianPage } from '../pages/kepegawaian.js';
import { PendidikanPage } from '../pages/pendidikan.js';
import { SertifikasiPage } from '../pages/sertifikasi.js';
import { JadwalPage } from '../pages/jadwal.js';
import { BebanMengajarPage } from '../pages/beban_mengajar.js';
import { AbsensiPage } from '../pages/absensi.js';
import { PKGPage } from '../pages/pkg.js';
import { PrestasiPage } from '../pages/prestasi.js';
import { PelatihanPage } from '../pages/pelatihan.js';
import { DokumenPage } from '../pages/dokumen.js';
import { AdministrasiPage } from '../pages/administrasi.js';
import { IDCardPage } from '../pages/idcard.js';
import { AuditLogsPage } from '../pages/audit_logs.js';
import { PengaturanPage } from '../pages/pengaturan.js';

class AppController {
  constructor() {
    this.currentView = 'view-dashboard';
    this.views = {
      'view-dashboard': DashboardPage,
      'view-guru': GuruPage,
      'view-profil-guru': ProfilGuruPage,
      'view-kepegawaian': KepegawaianPage,
      'view-pendidikan': PendidikanPage,
      'view-sertifikasi': SertifikasiPage,
      'view-jadwal': JadwalPage,
      'view-beban': BebanMengajarPage,
      'view-absensi': AbsensiPage,
      'view-pkg': PKGPage,
      'view-prestasi': PrestasiPage,
      'view-pelatihan': PelatihanPage,
      'view-dokumen': DokumenPage,
      'view-administrasi': AdministrasiPage,
      'view-idcard': IDCardPage,
      'view-audit': AuditLogsPage,
      'view-pengaturan': PengaturanPage
    };
  }

  async init() {
    Theme.init();
    Toast.init();

    // Inisialisasi Auth
    try {
      const user = await Auth.init();
      if (user) {
        this.hideLoginOverlay();
        this.updateUserUI();
        this.applyRBAC();
      } else {
        this.showLoginOverlay();
      }
    } catch (err) {
      console.error('[App] Auth init failed:', err);
      this.showLoginOverlay();
      Toast.error('Autentikasi Gagal', 'Gagal memuat sesi pengguna. Silakan login kembali.');
    }

    // Inisialisasi Database Store & Realtime
    try {
      await Store.init();
    } catch (err) {
      console.error('[App] Store init failed:', err);
      Toast.warning('Koneksi Terbatas', 'Gagal menyinkronkan data dari server. Mode offline aktif.');
    }

    // Bind events
    this.bindRealtimeAndSyncStatus();
    this.bindNavigation();
    this.bindAuthEvents();
    this.bindGlobalForms();

    // Auto-refresh view aktif saat Store berubah
    Store.subscribe(() => {
      this.refreshCurrentView();
    });

    // Render halaman awal
    this.navigateTo(this.currentView);
  }

  bindNavigation() {
    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const viewId = el.getAttribute('data-view');
        if (viewId) this.navigateTo(viewId);
      });
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        if (backdrop) backdrop.classList.toggle('show');
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('show');
        backdrop.classList.remove('show');
      });
    }
  }

  navigateTo(viewId, params = {}) {
    // ── RBAC Check ──
    const navLink = document.querySelector(`.nav-menu-link[data-view="${viewId}"]`);
    const parentLi = navLink ? navLink.closest('li[data-allowed-roles]') : null;

    if (parentLi) {
      const allowedRoles = parentLi.getAttribute('data-allowed-roles').split(',').map(r => r.trim());
      const currentRole = Auth.getRole();
      if (!allowedRoles.includes(currentRole)) {
        Toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk mengakses halaman ini.');
        // Kembali ke view saat ini (tidak redirect paksa jika sudah di dashboard)
        if (this.currentView !== viewId) return;
        viewId = 'view-dashboard';
      }
    }

    this.currentView = viewId;

    // Sembunyikan semua view
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('d-none'));

    // Tampilkan view target
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.remove('d-none');
    }

    // Update active class di sidebar
    document.querySelectorAll('.nav-menu-link').forEach(link => {
      if (link.getAttribute('data-view') === viewId) link.classList.add('active');
      else link.classList.remove('active');
    });

    // Tutup sidebar mobile setelah navigasi
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('show');
    if (backdrop) backdrop.classList.remove('show');

    // Init module halaman
    const module = this.views[viewId];
    if (module && typeof module.init === 'function') {
      try {
        if (viewId === 'view-profil-guru') {
          // Guru hanya bisa lihat profilnya sendiri
          let guruId = params.guruId;
          if (!guruId && !Auth.isAdminOrOperator()) {
            guruId = Auth.getProfile()?.guru_id || null;
          }
          module.init(guruId);
        } else {
          module.init();
        }
      } catch (e) {
        console.error(`[App] Error initializing module ${viewId}:`, e);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  refreshCurrentView() {
    const module = this.views[this.currentView];
    if (module && typeof module.render === 'function') {
      try {
        module.render();
      } catch (e) {
        console.warn('[App] refreshCurrentView error:', e.message);
      }
    }
  }

  bindRealtimeAndSyncStatus() {
    const badge = document.getElementById('realtime-status');
    if (!badge) return;

    Realtime.onStatusChange((status) => {
      if (status === 'online') {
        badge.className = 'badge bg-success-subtle text-success border border-success w-100 py-1';
        badge.innerHTML = '<i class="bi bi-broadcast me-1"></i> Realtime Aktif';
      } else if (status === 'connecting') {
        badge.className = 'badge bg-warning-subtle text-warning border border-warning w-100 py-1';
        badge.innerHTML = '<i class="bi bi-arrow-repeat me-1 spin"></i> Menghubungkan...';
      } else {
        badge.className = 'badge bg-secondary-subtle text-secondary border w-100 py-1';
        badge.innerHTML = '<i class="bi bi-cloud-slash me-1"></i> Mode Offline';
      }
    });

    Sync.onSyncStatusChange((syncStatus) => {
      if (syncStatus === 'syncing') {
        Toast.info('Sinkronisasi', 'Menyelaraskan data offline ke server...');
      }
    });
  }

  bindAuthEvents() {
    // Form Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-username')?.value;
        const pass = document.getElementById('login-password')?.value;
        const btn = document.getElementById('login-submit-btn');
        const errEl = document.getElementById('login-error-msg');

        // Reset error
        if (errEl) errEl.style.display = 'none';

        try {
          if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i> Memuat...'; }
          await Auth.login(email, pass);
          this.hideLoginOverlay();
          this.updateUserUI();
          // FIX: applyRBAC dipanggil setelah login berhasil
          this.applyRBAC();
          Toast.success('Selamat Datang', `Login berhasil sebagai ${Auth.getProfile().nama_lengkap}.`);
          // Navigasi ulang ke dashboard agar tampilan sesuai role
          this.navigateTo('view-dashboard');
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message || 'Login gagal. Periksa username dan password.';
            errEl.style.display = 'block';
          }
        } finally {
          if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Masuk ke Sistem'; }
        }
      });
    }

    // Demo autofill buttons
    document.querySelectorAll('.login-hint-row').forEach(row => {
      row.addEventListener('click', () => {
        const u = row.getAttribute('data-user');
        const p = row.getAttribute('data-pass');
        const userInp = document.getElementById('login-username');
        const passInp = document.getElementById('login-password');
        if (userInp) userInp.value = u;
        if (passInp) passInp.value = p;
      });
    });

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (confirm('Keluar dari aplikasi?')) {
          await Auth.logout();
          this.showLoginOverlay();
          // Reset UI nama ke default
          const nameEl = document.getElementById('topbar-user-name');
          const roleEl = document.getElementById('topbar-user-role');
          if (nameEl) nameEl.textContent = 'Administrator';
          if (roleEl) roleEl.textContent = 'ADMIN';
        }
      });
    }
  }

  showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  updateUserUI() {
    const p = Auth.getProfile();
    const nameEl = document.getElementById('topbar-user-name');
    const roleEl = document.getElementById('topbar-user-role');
    if (nameEl) nameEl.textContent = p.nama_lengkap || 'Pengguna';
    if (roleEl) roleEl.textContent = (p.role || 'guru').toUpperCase();
  }

  /**
   * Terapkan RBAC: sembunyikan/tampilkan elemen berdasarkan role
   */
  applyRBAC() {
    const role = Auth.getRole();

    // 1. Sembunyikan menu sidebar berdasarkan data-allowed-roles
    document.querySelectorAll('[data-allowed-roles]').forEach(el => {
      const allowedRoles = el.getAttribute('data-allowed-roles').split(',').map(r => r.trim());
      el.style.display = allowedRoles.includes(role) ? '' : 'none';
    });

    // 2. Sembunyikan tombol aksi (Tambah/Simpan/Hapus) dari Guru
    document.querySelectorAll('.rbac-restricted').forEach(el => {
      el.style.display = Auth.isAdminOrOperator() ? '' : 'none';
    });
  }

  bindGlobalForms() {
    document.addEventListener('submit', (e) => {
      const target = e.target;
      if (target.id === 'form-guru') {
        e.preventDefault();
        GuruPage.saveGuru(target);
      } else if (target.id === 'form-kepegawaian') {
        e.preventDefault();
        KepegawaianPage.saveKepegawaian(target);
      } else if (target.id === 'form-pendidikan') {
        e.preventDefault();
        PendidikanPage.savePendidikan(target);
      } else if (target.id === 'form-sertifikasi') {
        e.preventDefault();
        SertifikasiPage.saveSertifikasi(target);
      } else if (target.id === 'form-jadwal') {
        e.preventDefault();
        JadwalPage.saveJadwal(target);
      } else if (target.id === 'form-beban') {
        e.preventDefault();
        BebanMengajarPage.saveBeban(target);
      } else if (target.id === 'form-pkg') {
        e.preventDefault();
        PKGPage.savePKG(target);
      } else if (target.id === 'form-prestasi') {
        e.preventDefault();
        PrestasiPage.savePrestasi(target);
      } else if (target.id === 'form-pelatihan') {
        e.preventDefault();
        PelatihanPage.savePelatihan(target);
      } else if (target.id === 'form-dokumen') {
        e.preventDefault();
        DokumenPage.saveDokumen(target);
      } else if (target.id === 'form-profil-sekolah') {
        e.preventDefault();
        PengaturanPage.saveProfilSekolah(target);
      } else if (target.id === 'form-pengaturan-sistem') {
        e.preventDefault();
        PengaturanPage.saveSettings(target);
      }
    });
  }
}

export const App = new AppController();

// Expose ke window untuk inline onclick & debugging
if (typeof window !== 'undefined') {
  window.App = App;
  window.GuruPage = GuruPage;
  window.ProfilGuruPage = ProfilGuruPage;
  window.KepegawaianPage = KepegawaianPage;
  window.PendidikanPage = PendidikanPage;
  window.SertifikasiPage = SertifikasiPage;
  window.JadwalPage = JadwalPage;
  window.BebanMengajarPage = BebanMengajarPage;
  window.AbsensiPage = AbsensiPage;
  window.PKGPage = PKGPage;
  window.PrestasiPage = PrestasiPage;
  window.PelatihanPage = PelatihanPage;
  window.DokumenPage = DokumenPage;
  window.AdministrasiPage = AdministrasiPage;
  window.IDCardPage = IDCardPage;
  window.AuditLogsPage = AuditLogsPage;
  window.PengaturanPage = PengaturanPage;
  window.Auth = Auth;
  window.Store = Store;
  window.Theme = Theme;
}

// Bootstrap pada DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
