/**
 * ============================================================================
 * ROUTER UTILITY MODULE
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * 
 * Mengelola navigasi antar tampilan (SPA Router), pembaruan judul header,
 * serta pemicu render ulang otomatis modul aktif.
 * ============================================================================
 */

const RouterUtil = {
  /**
   * Pemetaan ID tampilan ke judul dan deskripsi halaman di topbar header.
   * @type {Object.<string, {title: string, desc: string}>}
   */
  viewTitles: {
    'view-dashboard': { title: 'Dashboard Utama', desc: 'Statistik & Monitoring Kinerja Guru SD Negeri Sumber Waru 2' },
    'view-guru': { title: 'Data Master Guru', desc: 'Kelola Identitas Lengkap Pendidik & Tenaga Kependidikan' },
    'view-pendidikan': { title: 'Riwayat Pendidikan', desc: 'Arsip Riwayat Pendidikan Formal Guru' },
    'view-sertifikasi': { title: 'Sertifikasi Guru', desc: 'Data Sertifikat Pendidik (PPG) & Nomor Registrasi Guru' },
    'view-kepegawaian': { title: 'Status Kepegawaian', desc: 'Informasi Pangkat, Golongan, SK & Masa Kerja' },
    'view-jadwal': { title: 'Jadwal Mengajar', desc: 'Jadwal Pembelajaran Kurikulum Merdeka (Fase A/B/C)' },
    'view-beban': { title: 'Beban Mengajar', desc: 'Monitoring Pemenuhan 24 JP & Tugas Tambahan' },
    'view-absensi': { title: 'Absensi Guru', desc: 'Presensi Kehadiran Harian & Rekapitulasi' },
    'view-pkg': { title: 'Penilaian Kinerja (PKG)', desc: 'Evaluasi Kinerja Guru & Predikat SKP' },
    'view-prestasi': { title: 'Prestasi & Penghargaan', desc: 'Rekam Jejak Prestasi Guru & Siswa Binaan' },
    'view-pelatihan': { title: 'Pelatihan & PMM', desc: 'Pengembangan Keprofesian Berkelanjutan (PKB)' },
    'view-dokumen': { title: 'Dokumen Digital (E-Arsip)', desc: 'Berkas Kepegawaian & Kependidikan Tersimpan Rapi' },
    'view-laporan': { title: 'Laporan & Kartu Identitas', desc: 'Cetak Biodata A4, Generator ID Card Guru & Export Excel' },
    'view-pengaturan': { title: 'Pengaturan Sistem', desc: 'Profil Sekolah, Manajemen Pengguna & Cadangan Database' }
  },

  /**
   * Berpindah ke tampilan halaman tertentu berdasarkan ID tampilan.
   * 
   * @param {string} viewId - ID elemen tampilan (contoh: 'view-dashboard', 'view-guru').
   */
  switchView(viewId) {
    // Sembunyikan semua elemen view
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));

    // Tampilkan elemen view yang dituju
    const targetEl = document.getElementById(viewId);
    if (targetEl) {
      targetEl.classList.add('active');
      if (typeof App !== 'undefined') {
        App.currentView = viewId;
      }
    }

    // Perbarui status aktif pada link navigasi sidebar
    document.querySelectorAll('.nav-menu-link').forEach(link => {
      if (link.getAttribute('data-view') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Perbarui judul & deskripsi di topbar
    const header = this.viewTitles[viewId] || { title: 'Database Guru', desc: 'SD Negeri Sumber Waru 2' };
    const titleEl = document.getElementById('topbar-view-title');
    const descEl = document.getElementById('topbar-view-desc');
    if (titleEl) titleEl.textContent = header.title;
    if (descEl) descEl.textContent = header.desc;

    // Trigger render khusus modul saat view dibuka
    this.triggerModuleRender(viewId);

    // Scroll kembali ke atas halaman
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Menjalankan kembali logika render modul yang sedang aktif tanpa melakukan scroll ulang.
   * Dipanggil secara reaktif saat terdapat perubahan state database.
   * 
   * @param {string} [currentViewId] - ID view aktif saat ini.
   */
  reRenderCurrentView(currentViewId) {
    const viewId = currentViewId || (typeof App !== 'undefined' ? App.currentView : 'view-dashboard');
    this.triggerModuleRender(viewId, true);
  },

  /**
   * Menjalankan fungsi pemicu render pada modul terkait berdasarkan ID view.
   * 
   * @param {string} viewId - ID tampilan target.
   * @param {boolean} [isReRender=false] - Menandakan apakah pemicu dipanggil dari re-render otomatis.
   */
  triggerModuleRender(viewId, isReRender = false) {
    if (viewId === 'view-absensi' && typeof AbsensiModule !== 'undefined') {
      AbsensiModule.renderGuruSelect();
      AbsensiModule.renderList();
      AbsensiModule.renderSummary();
      if (!isReRender && typeof AbsensiModule.updateDateLabel === 'function') {
        AbsensiModule.updateDateLabel();
      }
    } else if (viewId === 'view-dashboard' && typeof DashboardModule !== 'undefined') {
      DashboardModule.renderKPIs();
      DashboardModule.renderCharts();
      DashboardModule.renderBirthdayRadar();
      DashboardModule.renderLongestTenure();
      DashboardModule.renderExpiringDocuments();
    } else if (viewId === 'view-guru' && typeof GuruModule !== 'undefined') {
      GuruModule.renderTable();
    } else if (viewId === 'view-kepegawaian' && typeof KepegawaianModule !== 'undefined') {
      KepegawaianModule.renderGuruSelect();
      KepegawaianModule.renderKPIs();
      KepegawaianModule.renderList();
    } else if (viewId === 'view-pendidikan' && typeof PendidikanModule !== 'undefined') {
      PendidikanModule.renderGuruSelect();
      PendidikanModule.renderKPIs();
      PendidikanModule.renderList();
    } else if (viewId === 'view-sertifikasi' && typeof SertifikasiModule !== 'undefined') {
      SertifikasiModule.renderGuruSelect();
      SertifikasiModule.renderKPIs();
      SertifikasiModule.renderList();
    } else if (viewId === 'view-jadwal' && typeof JadwalModule !== 'undefined') {
      JadwalModule.renderGuruSelect();
      JadwalModule.renderList();
    } else if (viewId === 'view-beban' && typeof BebanMengajarModule !== 'undefined') {
      BebanMengajarModule.renderGuruSelect();
      BebanMengajarModule.renderList();
    } else if (viewId === 'view-pkg' && typeof PKGModule !== 'undefined') {
      PKGModule.renderGuruSelect();
      PKGModule.renderList();
    } else if (viewId === 'view-prestasi' && typeof PrestasiModule !== 'undefined') {
      PrestasiModule.renderGuruSelect();
      PrestasiModule.renderList();
    } else if (viewId === 'view-pelatihan' && typeof PelatihanModule !== 'undefined') {
      PelatihanModule.renderGuruSelect();
      PelatihanModule.renderList();
    } else if (viewId === 'view-dokumen' && typeof DokumenModule !== 'undefined') {
      DokumenModule.renderGuruSelect();
      DokumenModule.renderList();
    } else if (viewId === 'view-laporan' && typeof LaporanModule !== 'undefined') {
      LaporanModule.renderGuruSelect();
    } else if (viewId === 'view-pengaturan' && typeof PengaturanModule !== 'undefined') {
      PengaturanModule.renderProfilSekolah();
      PengaturanModule.renderVisualAndTema();
      PengaturanModule.renderAdvancedAndIntegration();
      PengaturanModule.renderUsers();
      PengaturanModule.renderAuditLogs();
      PengaturanModule.renderBackendSettings();
      PengaturanModule.updateBackendStatusUI();
    }
  }
};
