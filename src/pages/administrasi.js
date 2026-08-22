/**
 * ============================================================================
 * ADMINISTRASI & SURAT MENYURAT PAGE MODULE
 * APDAGU Enterprise v2.0
 * Surat Tugas, SK Pembagian Tugas Mengajar, SK Mengajar
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { ExportUtils } from '../utils/export_utils.js';

export const AdministrasiPage = {
  init() {
    this.renderGuruSelect();
  },

  renderGuruSelect() {
    const selects = ['surat-tugas-guru-id', 'sk-mengajar-guru-id'];
    const guruList = Store.getAll('guru');
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `<option value="">-- Pilih Guru --</option>` +
          guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
      }
    });
  },

  cetakSuratTugas() {
    const guruId = document.getElementById('surat-tugas-guru-id')?.value;
    const nomorSurat = document.getElementById('surat-tugas-nomor')?.value || '421.2/012/432.301.02/2026';
    const keperluan = document.getElementById('surat-tugas-keperluan')?.value || 'Mengikuti Kegiatan Pelatihan Mandiri';
    const lokasi = document.getElementById('surat-tugas-lokasi')?.value || 'Dinas Pendidikan Kab. Pamekasan';
    const tanggalKegiatan = document.getElementById('surat-tugas-tanggal')?.value || new Date().toISOString().slice(0, 10);

    const guru = Store.getById('guru', guruId);
    if (!guru) {
      alert('Pilih guru yang ditugaskan!');
      return;
    }

    const sekolah = Store.getSchoolProfile();

    const html = `
      <div style="text-align:center; margin-bottom: 25px;">
        <h4 style="margin:0; text-decoration: underline; letter-spacing: 1px;">SURAT TUGAS</h4>
        <p style="margin:4px 0;">Nomor: ${nomorSurat}</p>
      </div>

      <p>Yang bertanda tangan di bawah ini:</p>
      <table class="no-border" style="width:100%; margin-left: 20px; margin-bottom: 15px;">
        <tr><td style="width:25%;">Nama</td><td style="width:3%;">:</td><td><strong>${sekolah.nama_kepala_sekolah || 'FAUZAN, S.Pd.SD.'}</strong></td></tr>
        <tr><td>NIP</td><td>:</td><td>${sekolah.nip_kepala_sekolah || '19720602 199605 1 001'}</td></tr>
        <tr><td>Jabatan</td><td>:</td><td>Kepala Sekolah</td></tr>
        <tr><td>Unit Kerja</td><td>:</td><td>${sekolah.nama_sekolah || 'SD Negeri Sumber Waru 2'}</td></tr>
      </table>

      <p>Memberikan tugas kepada:</p>
      <table class="no-border" style="width:100%; margin-left: 20px; margin-bottom: 15px;">
        <tr><td style="width:25%;">Nama</td><td style="width:3%;">:</td><td><strong>${Helpers.formatNamaGelar(guru)}</strong></td></tr>
        <tr><td>NIP / NUPTK</td><td>:</td><td>${guru.nip || guru.nuptk || '-'}</td></tr>
        <tr><td>Unit Kerja</td><td>:</td><td>${sekolah.nama_sekolah || 'SD Negeri Sumber Waru 2'}</td></tr>
      </table>

      <p>Untuk melaksanakan tugas dalam rangka:</p>
      <table class="no-border" style="width:100%; margin-left: 20px; margin-bottom: 25px;">
        <tr><td style="width:25%;">Kegiatan</td><td style="width:3%;">:</td><td><strong>${keperluan}</strong></td></tr>
        <tr><td>Tempat / Lokasi</td><td>:</td><td>${lokasi}</td></tr>
        <tr><td>Hari, Tanggal</td><td>:</td><td>${Helpers.formatDate(tanggalKegiatan, true)}</td></tr>
      </table>

      <p>Demikian Surat Tugas ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab dan melaporkan hasilnya kepada Kepala Sekolah.</p>

      <table class="no-border" style="width:100%; margin-top: 40px;">
        <tr>
          <td style="width:50%;"></td>
          <td style="width:50%; text-align:center;">
            Pamekasan, ${Helpers.formatDate(new Date())}<br>
            Kepala Sekolah,<br><br><br><br>
            <strong>${sekolah.nama_kepala_sekolah || 'FAUZAN, S.Pd.SD.'}</strong><br>
            NIP. ${sekolah.nip_kepala_sekolah || '19720602 199605 1 001'}
          </td>
        </tr>
      </table>
    `;

    ExportUtils.printA4(html, `Surat_Tugas_${guru.nama_lengkap}`);
  }
};
