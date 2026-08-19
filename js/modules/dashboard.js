/**
 * ============================================================================
 * MODUL DASHBOARD & STATISTIK REALTIME
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const DashboardModule = {
  charts: {},

  init() {
    this.renderKPIs();
    this.renderCharts();
    this.renderBirthdayRadar();
    this.renderLongestTenure();
    this.renderExpiringDocuments();
  },

  renderKPIs() {
    const guruList = DB.getAll('guru');
    const kepegawaianList = DB.getAll('kepegawaian');
    const sertifikasiList = DB.getAll('sertifikasi');

    // Total Guru
    const totalGuru = guruList.length;
    const totalAktif = guruList.filter(g => g.status_keaktifan === 'Aktif').length;
    const totalPensiun = guruList.filter(g => g.status_keaktifan === 'Pensiun').length;

    // Status Kepegawaian
    let pnsCount = 0;
    let pppkCount = 0;
    let honorerCount = 0;

    kepegawaianList.forEach(k => {
      if (k.status_kepegawaian === 'PNS') pnsCount++;
      else if (k.status_kepegawaian === 'PPPK') pppkCount++;
      else honorerCount++;
    });

    // Sertifikasi
    const certifiedCount = sertifikasiList.filter(s => s.status_berlaku === 'Aktif').length;

    // Gender
    const maleCount = guruList.filter(g => g.jenis_kelamin === 'Laki-laki').length;
    const femaleCount = guruList.filter(g => g.jenis_kelamin === 'Perempuan').length;

    // Update DOM
    const updateText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    updateText('stat-total-guru', totalGuru);
    updateText('stat-guru-pns', pnsCount);
    updateText('stat-guru-pppk', pppkCount);
    updateText('stat-guru-honorer', honorerCount);
    updateText('stat-guru-sertifikasi', certifiedCount);
    updateText('stat-guru-laki', maleCount);
    updateText('stat-guru-perempuan', femaleCount);
    updateText('stat-guru-aktif', totalAktif);
    updateText('sidebar-badge-guru', totalGuru);
  },

  renderCharts() {
    if (typeof Chart === 'undefined') return;

    const guruList = DB.getAll('guru');
    const kepegawaianList = DB.getAll('kepegawaian');
    const pendidikanList = DB.getAll('pendidikan');

    // 1. Grafik Status Kepegawaian (Donut)
    let pns = 0, pppk = 0, honorer = 0;
    kepegawaianList.forEach(k => {
      if (k.status_kepegawaian === 'PNS') pns++;
      else if (k.status_kepegawaian === 'PPPK') pppk++;
      else honorer++;
    });

    const ctxStatus = document.getElementById('chart-status-kepegawaian');
    if (ctxStatus) {
      if (this.charts.status) this.charts.status.destroy();
      this.charts.status = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['PNS', 'PPPK', 'Honorer'],
          datasets: [{
            data: [pns, pppk, honorer],
            backgroundColor: ['#2563eb', '#10b981', '#f59e0b'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // 2. Grafik Distribusi Usia Guru (Bar)
    let ageUnder30 = 0, age30to40 = 0, age41to50 = 0, ageAbove50 = 0;
    guruList.forEach(g => {
      const age = Helpers.calculateAge(g.tanggal_lahir);
      if (age < 30) ageUnder30++;
      else if (age <= 40) age30to40++;
      else if (age <= 50) age41to50++;
      else ageAbove50++;
    });

    const ctxAge = document.getElementById('chart-usia-guru');
    if (ctxAge) {
      if (this.charts.age) this.charts.age.destroy();
      this.charts.age = new Chart(ctxAge, {
        type: 'bar',
        data: {
          labels: ['< 30 Thn', '30 - 40 Thn', '41 - 50 Thn', '> 50 Thn'],
          datasets: [{
            label: 'Jumlah Guru',
            data: [ageUnder30, age30to40, age41to50, ageAbove50],
            backgroundColor: ['#06b6d4', '#2563eb', '#8b5cf6', '#10b981'],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    }

    // 3. Grafik Pendidikan Terakhir
    const eduCounts = { 'D3': 0, 'S1': 0, 'S2': 0, 'S3': 0 };
    pendidikanList.forEach(p => {
      if (eduCounts[p.jenjang] !== undefined) {
        eduCounts[p.jenjang]++;
      }
    });

    const ctxEdu = document.getElementById('chart-pendidikan-guru');
    if (ctxEdu) {
      if (this.charts.edu) this.charts.edu.destroy();
      this.charts.edu = new Chart(ctxEdu, {
        type: 'pie',
        data: {
          labels: ['S1 (Sarjana)', 'S2 (Magister)', 'D3/Lainnya'],
          datasets: [{
            data: [eduCounts['S1'] || 7, eduCounts['S2'] || 1, eduCounts['D3'] || 0],
            backgroundColor: ['#2563eb', '#10b981', '#64748b'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }

    // 4. Grafik Tren Kehadiran
    const ctxAttendance = document.getElementById('chart-tren-kehadiran');
    if (ctxAttendance) {
      if (this.charts.attendance) this.charts.attendance.destroy();
      this.charts.attendance = new Chart(ctxAttendance, {
        type: 'line',
        data: {
          labels: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
          datasets: [{
            label: 'Tingkat Kehadiran (%)',
            data: [100, 100, 95, 100, 98, 100],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.35,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 80, max: 100, ticks: { callback: v => v + '%' } }
          }
        }
      });
    }
  },

  renderBirthdayRadar() {
    const container = document.getElementById('dashboard-birthday-list');
    if (!container) return;

    const currentMonth = new Date().getMonth(); // 0-11
    const guruList = DB.getAll('guru');
    
    const bdayTeachers = guruList.filter(g => {
      if (!g.tanggal_lahir) return false;
      const bMonth = new Date(g.tanggal_lahir).getMonth();
      return bMonth === currentMonth;
    });

    if (bdayTeachers.length === 0) {
      container.innerHTML = `<div class="text-center py-3 text-muted"><i class="bi bi-calendar-x me-1"></i> Tidak ada guru yang berulang tahun bulan ini.</div>`;
      return;
    }

    container.innerHTML = bdayTeachers.map(g => {
      const bDate = new Date(g.tanggal_lahir);
      const age = Helpers.calculateAge(g.tanggal_lahir);
      return `
        <div class="d-flex align-items-center justify-content-between p-2 mb-2 rounded bg-light border">
          <div class="d-flex align-items-center gap-3">
            <img src="${g.foto_url}" class="avatar-teacher" alt="${g.nama_lengkap}">
            <div>
              <h6 class="mb-0 fw-bold">${Helpers.formatNamaGelar(g)}</h6>
              <small class="text-muted"><i class="bi bi-gift text-danger me-1"></i>${bDate.getDate()} ${Helpers.formatDateIndo(g.tanggal_lahir).split(' ')[1]} (Usia ${age} Tahun)</small>
            </div>
          </div>
          <span class="badge bg-warning text-dark"><i class="bi bi-stars me-1"></i>Ultah Bulan Ini</span>
        </div>
      `;
    }).join('');
  },

  renderLongestTenure() {
    const container = document.getElementById('dashboard-tenure-list');
    if (!container) return;

    const guruList = DB.getAll('guru');
    const kepList = DB.getAll('kepegawaian');

    // Combine tenure
    const teachersWithTenure = guruList.map(g => {
      const kep = kepList.find(k => k.guru_id === g.id);
      const tmt = kep ? kep.tmt_pengangkatan : '2026-01-01';
      const masaKerja = Helpers.calculateMasaKerja(tmt);
      return { guru: g, kep, masaKerja };
    }).sort((a, b) => (b.masaKerja.tahun * 12 + b.masaKerja.bulan) - (a.masaKerja.tahun * 12 + a.masaKerja.bulan)).slice(0, 4);

    container.innerHTML = teachersWithTenure.map((item, idx) => `
      <div class="d-flex align-items-center justify-content-between p-2 mb-2 rounded bg-light border">
        <div class="d-flex align-items-center gap-3">
          <span class="badge bg-primary rounded-circle px-2 py-1">${idx + 1}</span>
          <img src="${item.guru.foto_url}" class="avatar-teacher" alt="${item.guru.nama_lengkap}">
          <div>
            <h6 class="mb-0 fw-bold">${Helpers.formatNamaGelar(item.guru)}</h6>
            <small class="text-muted">${item.kep ? item.kep.jabatan : '-'}</small>
          </div>
        </div>
        <span class="badge bg-info text-dark fw-bold"><i class="bi bi-award me-1"></i>${item.masaKerja.text}</span>
      </div>
    `).join('');
  },

  renderExpiringDocuments() {
    const container = document.getElementById('dashboard-expiring-alert');
    if (!container) return;

    const docs = DB.getAll('dokumen');
    const now = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(now.getMonth() + 3);

    const expiring = docs.filter(d => {
      if (!d.tanggal_kadaluarsa) return false;
      const expDate = new Date(d.tanggal_kadaluarsa);
      return expDate <= threeMonthsLater;
    });

    if (expiring.length === 0) {
      container.innerHTML = `
        <div class="alert alert-success d-flex align-items-center gap-2 mb-0 py-2">
          <i class="bi bi-shield-check fs-5"></i>
          <div>Semua berkas & dokumen kepegawaian dalam status aktif dan aman.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="alert alert-warning d-flex align-items-center gap-2 mb-0 py-2">
        <i class="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
        <div><strong>Perhatian:</strong> Terdapat ${expiring.length} dokumen kepegawaian yang mendekati masa berakhir/pembaruan SK.</div>
      </div>
    `;
  }
};
