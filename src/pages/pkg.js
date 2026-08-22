/**
 * ============================================================================
 * PKG (PENILAIAN KINERJA GURU / SKP) PAGE MODULE
 * APDAGU Enterprise v2.0
 * 5 Aspek Penilaian, Predikat Otomatis, Grafik Nilai, Cetak Lembar PKG
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';
import { ExportUtils } from '../utils/export_utils.js';

export const PKGPage = {
  filterTahun: 'all',
  chartInstance: null,

  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.render();
  },

  bindEvents() {
    ['form-pkg-perencanaan', 'form-pkg-pelaksanaan', 'form-pkg-evaluasi', 'form-pkg-profesional', 'form-pkg-kehadiran'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.calculateFinalScore());
    });
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-pkg-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru Dinilai --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  calculateFinalScore() {
    const p = parseFloat(document.getElementById('form-pkg-perencanaan')?.value) || 0;
    const l = parseFloat(document.getElementById('form-pkg-pelaksanaan')?.value) || 0;
    const e = parseFloat(document.getElementById('form-pkg-evaluasi')?.value) || 0;
    const pr = parseFloat(document.getElementById('form-pkg-profesional')?.value) || 0;
    const k = parseFloat(document.getElementById('form-pkg-kehadiran')?.value) || 0;

    // Bobot standar: 20% Perencanaan, 30% Pelaksanaan, 20% Evaluasi, 15% Profesional, 15% Kehadiran
    const finalScore = (p * 0.20) + (l * 0.30) + (e * 0.20) + (pr * 0.15) + (k * 0.15);
    const predikatInfo = Helpers.getPredikatPKG(finalScore);

    const scoreDisplay = document.getElementById('form-pkg-nilai-akhir');
    const predikatDisplay = document.getElementById('form-pkg-predikat');

    if (scoreDisplay) scoreDisplay.value = finalScore.toFixed(1);
    if (predikatDisplay) predikatDisplay.value = predikatInfo.predikat;
  },

  render() {
    const tbody = document.getElementById('pkg-table-body');
    if (!tbody) return;

    let list = Store.getAll('pkg');
    if (this.filterTahun !== 'all') {
      list = list.filter(p => String(p.tahun_penilaian) === String(this.filterTahun));
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada data penilaian kinerja guru.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((p, idx) => {
      const guru = Store.getById('guru', p.guru_id) || {};
      const pred = Helpers.getPredikatPKG(p.nilai_akhir);

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">Tahun: <strong>${p.tahun_penilaian}</strong></small>
          </td>
          <td class="text-center">${p.skor_perencanaan}</td>
          <td class="text-center">${p.skor_pelaksanaan}</td>
          <td class="text-center">${p.skor_evaluasi}</td>
          <td class="text-center">${p.skor_profesionalisme}</td>
          <td class="text-center fw-bold text-primary fs-6">${p.nilai_akhir}</td>
          <td class="text-center">
            <span class="badge ${pred.badge}">${p.predikat} (${pred.persentase})</span>
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-dark me-1" onclick="PKGPage.printPKG('${p.id}')" title="Cetak"><i class="bi bi-printer"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="PKGPage.deletePKG('${p.id}')" title="Hapus"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.renderGuruSelect();
    const form = document.getElementById('form-pkg');
    if (form) form.reset();
    this.calculateFinalScore();
    new bootstrap.Modal(document.getElementById('modal-pkg')).show();
  },

  async savePKG(formEl) {
    const formData = new FormData(formEl);
    const p = parseFloat(formData.get('skor_perencanaan')) || 0;
    const l = parseFloat(formData.get('skor_pelaksanaan')) || 0;
    const e = parseFloat(formData.get('skor_evaluasi')) || 0;
    const pr = parseFloat(formData.get('skor_profesionalisme')) || 0;
    const k = parseFloat(formData.get('skor_kehadiran')) || 0;
    const finalScore = (p * 0.20) + (l * 0.30) + (e * 0.20) + (pr * 0.15) + (k * 0.15);

    const payload = {
      guru_id: formData.get('guru_id'),
      tahun_penilaian: parseInt(formData.get('tahun_penilaian')) || new Date().getFullYear(),
      periode: 'Tahunan',
      skor_perencanaan: p,
      skor_pelaksanaan: l,
      skor_evaluasi: e,
      skor_profesionalisme: pr,
      skor_kehadiran: k,
      nilai_akhir: parseFloat(finalScore.toFixed(1)),
      predikat: Helpers.getPredikatPKG(finalScore).predikat,
      nama_penilai: formData.get('nama_penilai') || 'Kepala Sekolah',
      nip_penilai: formData.get('nip_penilai') || '',
      catatan_rekomendasi: formData.get('catatan_rekomendasi') || 'Tingkatkan dan pertahankan kinerja profesional.'
    };

    try {
      await Store.insert('pkg', payload);
      Toast.success('Berhasil', 'Penilaian Kinerja Guru berhasil disimpan.');
      bootstrap.Modal.getInstance(document.getElementById('modal-pkg'))?.hide();
      this.render();
    } catch (err) {
      Toast.error('Gagal', err.message);
    }
  },

  async deletePKG(id) {
    if (!confirm('Hapus penilaian kinerja ini?')) return;
    try {
      await Store.delete('pkg', id);
      Toast.success('Dihapus', 'Data PKG berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  printPKG(id) {
    const p = Store.getById('pkg', id);
    if (!p) return;
    const guru = Store.getById('guru', p.guru_id) || {};
    const sekolah = Store.getSchoolProfile();

    const html = `
      <div style="text-align:center; margin-bottom: 20px;">
        <h4 style="margin:0; text-decoration: underline;">LEMBAR HASIL PENILAIAN KINERJA GURU (PKG)</h4>
        <p style="margin:4px 0;">Tahun Penilaian: <strong>${p.tahun_penilaian}</strong></p>
      </div>

      <table class="no-border" style="width:100%; margin-bottom: 15px;">
        <tr><td style="width:25%;">Nama Guru</td><td style="width:3%;">:</td><td><strong>${Helpers.formatNamaGelar(guru)}</strong></td></tr>
        <tr><td>NIP / NUPTK</td><td>:</td><td>${guru.nip || guru.nuptk || '-'}</td></tr>
        <tr><td>Unit Kerja</td><td>:</td><td>${sekolah.nama_sekolah || 'SDN Sumber Waru 2'}</td></tr>
      </table>

      <table>
        <thead>
          <tr>
            <th>No</th><th>Komponen / Aspek Penilaian</th><th>Bobot</th><th>Skor (0-100)</th><th>Skor Terbobot</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="text-align:center;">1</td><td>Perencanaan Pembelajaran</td><td style="text-align:center;">20%</td><td style="text-align:center;">${p.skor_perencanaan}</td><td style="text-align:center;">${(p.skor_perencanaan * 0.20).toFixed(1)}</td></tr>
          <tr><td style="text-align:center;">2</td><td>Pelaksanaan Pembelajaran</td><td style="text-align:center;">30%</td><td style="text-align:center;">${p.skor_pelaksanaan}</td><td style="text-align:center;">${(p.skor_pelaksanaan * 0.30).toFixed(1)}</td></tr>
          <tr><td style="text-align:center;">3</td><td>Penilaian & Evaluasi</td><td style="text-align:center;">20%</td><td style="text-align:center;">${p.skor_evaluasi}</td><td style="text-align:center;">${(p.skor_evaluasi * 0.20).toFixed(1)}</td></tr>
          <tr><td style="text-align:center;">4</td><td>Kompetensi Profesional</td><td style="text-align:center;">15%</td><td style="text-align:center;">${p.skor_profesionalisme}</td><td style="text-align:center;">${(p.skor_profesionalisme * 0.15).toFixed(1)}</td></tr>
          <tr><td style="text-align:center;">5</td><td>Kedisiplinan & Kehadiran</td><td style="text-align:center;">15%</td><td style="text-align:center;">${p.skor_kehadiran}</td><td style="text-align:center;">${(p.skor_kehadiran * 0.15).toFixed(1)}</td></tr>
          <tr style="font-weight:bold; background:#f9f9f9;">
            <td colspan="3" style="text-align:right;">NILAI AKHIR / PREDIKAT :</td>
            <td colspan="2" style="text-align:center; font-size:14pt;">${p.nilai_akhir} (${p.predikat})</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 15px;">
        <strong>Catatan Rekomendasi:</strong>
        <p style="border:1px solid #ccc; padding:8px; border-radius:4px;">${p.catatan_rekomendasi || '-'}</p>
      </div>

      <table class="no-border" style="width:100%; margin-top: 30px;">
        <tr>
          <td style="width:50%; text-align:center;">
            Guru Yang Dinilai,<br><br><br><br>
            <strong>${Helpers.formatNamaGelar(guru)}</strong><br>
            NIP. ${guru.nip || '-'}
          </td>
          <td style="width:50%; text-align:center;">
            Pamekasan, ${Helpers.formatDate(new Date())}<br>
            Kepala Sekolah / Penilai,<br><br><br><br>
            <strong>${p.nama_penilai}</strong><br>
            NIP. ${p.nip_penilai || '-'}
          </td>
        </tr>
      </table>
    `;

    ExportUtils.printA4(html, `Lembar_PKG_${guru.nama_lengkap}_${p.tahun_penilaian}`);
  }
};
