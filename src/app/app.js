/**
 * ============================================================================
 * MAIN APPLICATION CONTROLLER & ROUTER
 * APDAGU Enterprise v2.0
 * Multi-user realtime, Offline-first, Supabase Auth & RLS
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
    const user = await Auth.init();
    if (user) {
      this.hideLoginOverlay();
      this.updateUserUI();
    } else {
      this.showLoginOverlay();
    }

    // Inisialisasi Database Store & Realtime
    await Store.init();

    // Status listeners
    this.bindRealtimeAndSyncStatus();
    this.bindNavigation();
    this.bindAuthEvents();
    this.bindGlobalForms();

    // Auto-refresh active view when store changes
    Store.subscribe((data, changedCollection) => {
      this.refreshCurrentView();
    });

    // Render initial page
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
    this.currentView = viewId;

    // Sembunyikan semua view container
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('d-none'));

    // Tampilkan view aktif
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.remove('d-none');
    }

    // Update active class di sidebar
    document.querySelectorAll('.nav-menu-link').forEach(link => {
      if (link.getAttribute('data-view') === viewId) link.classList.add('active');
      else link.classList.remove('active');
    });

    // Init module
    const module = this.views[viewId];
    if (module && typeof module.init === 'function') {
      if (viewId === 'view-profil-guru') {
        module.init(params.guruId);
      } else {
        module.init();
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  refreshCurrentView() {
    const module = this.views[this.currentView];
    if (module && typeof module.render === 'function') {
      module.render();
    }
  }

  bindRealtimeAndSyncStatus() {
    const badge = document.getElementById('realtime-status');
    if (!badge) return;

    Realtime.onStatusChange((status) => {
      if (status === 'online') {
        badge.className = 'badge bg-success-subtle text-success border border-success';
        badge.innerHTML = '<i class="bi bi-broadcast me-1"></i> Realtime Aktif';
      } else if (status === 'connecting') {
        badge.className = 'badge bg-warning-subtle text-warning border border-warning';
        badge.innerHTML = '<i class="bi bi-arrow-repeat me-1 spin"></i> Menghubungkan...';
      } else {
        badge.className = 'badge bg-secondary-subtle text-secondary border';
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
    // Form Login Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-username')?.value;
        const pass = document.getElementById('login-password')?.value;
        const btn = document.getElementById('login-submit-btn');

        try {
          if (btn) btn.disabled = true;
          await Auth.login(email, pass);
          this.hideLoginOverlay();
          this.updateUserUI();
          Toast.success('Selamat Datang', `Login berhasil sebagai ${Auth.getProfile().nama_lengkap}.`);
        } catch (err) {
          const errEl = document.getElementById('login-error-msg');
          if (errEl) {
            errEl.textContent = err.message || 'Login gagal. Periksa username dan password.';
            errEl.style.display = 'block';
          }
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    // Demo account autofill buttons
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

  bindGlobalForms() {
    // Form submissions routing
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
      }
    });
  }
}

export const App = new AppController();

// Expose modules to window for inline onclick attributes & console
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

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
