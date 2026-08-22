/**
 * ============================================================================
 * DASHBOARD PAGE MODULE
 * APDAGU Enterprise v2.0
 * Live KPI Statistics, Attendance Today, Realtime Charts, Alerts
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';

export const DashboardPage = {
  chartInstance: null,

  init() {
    this.renderKPI();
    this.renderAttendanceToday();
    this.renderCharts();
    this.renderAlerts();
  },

  renderKPI() {
    const guruList = Store.getAll('guru');
    const kepegList = Store.getAll('kepegawaian');
    const sertifList = Store.getAll('sertifikasi');
    const bebanList = Store.getAll('beban_mengajar');
    const absensiList = Store.getAll('absensi');

    const todayStr = new Date().toISOString().slice(0, 10);
    const absensiHariIni = absensiList.filter(a => a.tanggal === todayStr);
    const hadirHariIni = absensiHariIni.filter(a => a.status_kehadiran === 'Hadir').length;

    const totalGuru = guruList.length;
    const guruPNS = kepegList.filter(k => k.status_kepegawaian === 'PNS').length;
    const guruPPPK = kepegList.filter(k => k.status_kepegawaian === 'PPPK').length;
    const guruHonorer = kepegList.filter(k => k.status_kepegawaian?.includes('Honorer') || k.status_kepegawaian === 'GTT').length;
    const guruSertifikasi = sertifList.filter(s => s.status_berlaku === 'Aktif').length;
    const totalJP = bebanList.reduce((acc, curr) => acc + (Number(curr.total_jp) || 0), 0);

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('kpi-total-guru', totalGuru);
    setVal('kpi-guru-pns', guruPNS);
    setVal('kpi-guru-pppk', guruPPPK);
    setVal('kpi-guru-honorer', guruHonorer);
    setVal('kpi-guru-sertif', guruSertifikasi);
    setVal('kpi-kehadiran-today', `${hadirHariIni} / ${totalGuru}`);
    setVal('kpi-total-jp', `${totalJP} JP`);
  },

  renderAttendanceToday() {
    const container = document.getElementById('dashboard-absensi-list');
    if (!container) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const guruList = Store.getAll('guru');
    const absensiList = Store.getAll('absensi').filter(a => a.tanggal === todayStr);

    if (guruList.length === 0) {
      container.innerHTML = `<div class="p-3 text-muted text-center">Belum ada data guru.</div>`;
      return;
    }

    container.innerHTML = guruList.slice(0, 6).map(guru => {
      const absen = absensiList.find(a => a.guru_id === guru.id);
      const status = absen ? absen.status_kehadiran : 'Belum Absen';
      const badgeClass = absen ? Helpers.getStatusKehadiranBadge(status) : 'bg-secondary text-white';
      const timeInfo = absen?.waktu_masuk ? Helpers.formatTime(absen.waktu_masuk) : '-';

      return `
        <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
          <div class="d-flex align-items-center gap-2">
            <img src="${guru.foto_url || Helpers.generateAvatarSvg(guru.nama_lengkap)}" class="rounded-circle" width="36" height="36" alt="">
            <div>
              <div class="fw-semibold text-dark fs-7">${Helpers.formatNamaGelar(guru)}</div>
              <small class="text-muted fs-8">${guru.nip || guru.nuptk || 'PTK'}</small>
            </div>
          </div>
          <div class="text-end">
            <span class="badge ${badgeClass} fs-8">${status}</span>
            <div class="fs-8 text-muted mt-1">${timeInfo}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderCharts() {
    const ctx = document.getElementById('dashboard-status-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    const kepegList = Store.getAll('kepegawaian');
    const counts = {
      PNS: kepegList.filter(k => k.status_kepegawaian === 'PNS').length,
      PPPK: kepegList.filter(k => k.status_kepegawaian === 'PPPK').length,
      Honorer: kepegList.filter(k => k.status_kepegawaian?.includes('Honorer') || k.status_kepegawaian === 'GTT').length
    };

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['PNS', 'PPPK', 'Honorer / GTT'],
        datasets: [{
          data: [counts.PNS, counts.PPPK, counts.Honorer],
          backgroundColor: ['#2563eb', '#10b981', '#f59e0b'],
          borderWidth: 2
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
  },

  renderAlerts() {
    const alertBox = document.getElementById('dashboard-alerts-container');
    if (!alertBox) return;

    const docs = Store.getAll('dokumen');
    const now = new Date();
    const expiringDocs = docs.filter(d => {
      if (!d.tanggal_kadaluarsa) return false;
      const exp = new Date(d.tanggal_kadaluarsa);
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays >= 0;
    });

    if (expiringDocs.length === 0) {
      alertBox.innerHTML = `
        <div class="alert alert-success d-flex align-items-center gap-2 mb-0 py-2 fs-7">
          <i class="bi bi-shield-check fs-5"></i>
          <div>Semua data dokumen dan berkas guru dalam status valid & aktif.</div>
        </div>
      `;
    } else {
      alertBox.innerHTML = `
        <div class="alert alert-warning d-flex align-items-center gap-2 mb-0 py-2 fs-7">
          <i class="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
          <div>Terdapat <strong>${expiringDocs.length} dokumen</strong> yang akan kadaluarsa dalam 30 hari ke depan.</div>
        </div>
      `;
    }
  }
};
