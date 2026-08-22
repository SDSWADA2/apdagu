/**
 * ============================================================================
 * ABSENSI & PRESENSI GPS / SELFIE PAGE MODULE
 * APDAGU Enterprise v2.0
 * Geolocation GPS, Selfie Webcam, Rekap Bulanan & Tahunan
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Auth } from '../services/auth.js';
import { Storage } from '../services/storage.js';
import { Camera } from '../utils/camera.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';
import { ExportUtils } from '../utils/export_utils.js';
import { CONFIG } from '../app/config.js';

export const AbsensiPage = {
  activeDate: new Date().toISOString().slice(0, 10),
  activeMonth: new Date().toISOString().slice(0, 7),
  currentGps: null,
  capturedSelfieBlob: null,

  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderDailyList();
  },

  bindEvents() {
    const dateInput = document.getElementById('absensi-filter-date');
    if (dateInput) {
      dateInput.value = this.activeDate;
      dateInput.addEventListener('change', (e) => {
        this.activeDate = e.target.value;
        this.renderDailyList();
      });
    }
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-absen-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  renderDailyList() {
    const tbody = document.getElementById('absensi-table-body');
    if (!tbody) return;

    const guruList = Store.getAll('guru');
    const absensiList = Store.getAll('absensi').filter(a => a.tanggal === this.activeDate);
    const canEdit = Auth.isAdminOrOperator();
    const myGuruId = Auth.getProfile()?.guru_id;

    if (guruList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data guru.</td></tr>`;
      return;
    }

    tbody.innerHTML = guruList.map((g, idx) => {
      const absen = absensiList.find(a => a.guru_id === g.id);
      const status = absen ? absen.status_kehadiran : 'Belum Absen';
      const badge = absen ? Helpers.getStatusKehadiranBadge(status) : 'bg-secondary text-white';
      // Guru hanya bisa presensi dirinya sendiri
      const canPresensi = canEdit || g.id === myGuruId;

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold">${Helpers.formatNamaGelar(g)}</div>
            <small class="text-muted">${g.nip || g.nuptk || '-'}</small>
          </td>
          <td class="text-center">
            <span class="badge ${badge}">${status}</span>
          </td>
          <td class="text-center">${absen?.waktu_masuk ? Helpers.formatTime(absen.waktu_masuk) : '-'}</td>
          <td class="text-center">${absen?.waktu_pulang ? Helpers.formatTime(absen.waktu_pulang) : '-'}</td>
          <td><small class="text-muted">${absen?.lokasi_gps ? '📍 Ada GPS' : '-'}</small></td>
          <td><small class="text-muted">${absen?.keterangan || '-'}</small></td>
          <td class="text-center">
            ${canPresensi ? `
              <button class="btn btn-sm btn-outline-primary" onclick="AbsensiPage.openPresensiModal('${g.id}')">
                <i class="bi bi-camera-fill me-1"></i>Presensi
              </button>` : '<span class="text-muted fs-8">—</span>'}
          </td>
        </tr>
      `;
    }).join('');
  },

  async openPresensiModal(guruId) {
    const guru = Store.getById('guru', guruId);
    if (!guru) return;

    const nameEl = document.getElementById('modal-absen-nama-guru');
    if (nameEl) nameEl.textContent = Helpers.formatNamaGelar(guru);

    const guruInput = document.getElementById('form-absen-guru-id-hidden');
    if (guruInput) guruInput.value = guruId;

    // Start Camera
    const video = document.getElementById('webcam-video');
    if (video) await Camera.start(video);

    // Geolocation
    this.detectGPS();

    new bootstrap.Modal(document.getElementById('modal-presensi-selfie')).show();
  },

  detectGPS() {
    const statusEl = document.getElementById('gps-status-text');
    if (!navigator.geolocation) {
      if (statusEl) statusEl.textContent = 'Geolocation tidak didukung browser.';
      return;
    }
    if (statusEl) statusEl.textContent = 'Mendeteksi lokasi GPS...';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.currentGps = `${latitude},${longitude}`;
        const dist = Helpers.calculateDistanceMeter(latitude, longitude, CONFIG.SEKOLAH.LATITUDE, CONFIG.SEKOLAH.LONGITUDE);
        if (statusEl) {
          statusEl.innerHTML = `📍 Jarak ke sekolah: <strong>${dist} meter</strong> ${dist <= CONFIG.SEKOLAH.RADIUS_ABSEN_METER ? '<span class="text-success">(Dalam Radius)</span>' : '<span class="text-warning">(Luar Radius)</span>'}`;
        }
      },
      (err) => {
        if (statusEl) statusEl.textContent = 'GPS dinonaktifkan / tidak terdeteksi.';
      }
    );
  },

  async captureSelfie() {
    const video = document.getElementById('webcam-video');
    this.capturedSelfieBlob = await Camera.captureBlob(video);
    const preview = document.getElementById('selfie-preview-img');
    if (preview && this.capturedSelfieBlob) {
      preview.src = URL.createObjectURL(this.capturedSelfieBlob);
      preview.classList.remove('d-none');
      if (video) video.classList.add('d-none');
    }
  },

  async submitPresensi(statusKehadiran) {
    const guruId = document.getElementById('form-absen-guru-id-hidden')?.value;
    if (!guruId) return;

    let foto_url = null;
    if (this.capturedSelfieBlob) {
      try {
        const uploadRes = await Storage.uploadFile('dokumen', this.capturedSelfieBlob, `absen_${guruId}_${Date.now()}`);
        foto_url = uploadRes.url;
      } catch (e) {
        console.warn('Gagal upload selfie:', e.message);
      }
    }

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const existing = Store.getAll('absensi').find(a => a.guru_id === guruId && a.tanggal === this.activeDate);

    const payload = {
      guru_id: guruId,
      tanggal: this.activeDate,
      status_kehadiran: statusKehadiran || 'Hadir',
      lokasi_gps: this.currentGps,
      foto_masuk_url: foto_url || existing?.foto_masuk_url,
      waktu_masuk: existing?.waktu_masuk || timeStr,
      waktu_pulang: existing?.waktu_masuk ? timeStr : null
    };

    try {
      if (existing) {
        payload.id = existing.id;
        await Store.update('absensi', payload);
      } else {
        await Store.insert('absensi', payload);
      }
      Toast.success('Presensi Tercatat', `Presensi untuk tanggal ${this.activeDate} berhasil disimpan.`);
      Camera.stop();
      bootstrap.Modal.getInstance(document.getElementById('modal-presensi-selfie'))?.hide();
      this.renderDailyList();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  exportRekapExcel() {
    const absensiList = Store.getAll('absensi');
    const guruList = Store.getAll('guru');

    const data = absensiList.map((a, i) => {
      const g = guruList.find(item => item.id === a.guru_id) || {};
      return {
        No: i + 1,
        Nama_Guru: Helpers.formatNamaGelar(g),
        NIP: g.nip || '',
        Tanggal: a.tanggal,
        Status: a.status_kehadiran,
        Waktu_Masuk: a.waktu_masuk || '',
        Waktu_Pulang: a.waktu_pulang || '',
        Keterangan: a.keterangan || ''
      };
    });

    ExportUtils.exportToExcel(data, `Rekap_Presensi_${this.activeDate}`, 'Presensi');
  }
};
