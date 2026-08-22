/**
 * ============================================================================
 * SERTIFIKASI GURU PAGE MODULE
 * APDAGU Enterprise v2.0
 * Sertifikat Pendidik, PPG, LPTK, NRG
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';

export const SertifikasiPage = {
  init() {
    this.renderGuruSelect();
    this.render();
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-sertifikasi-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  render() {
    const tbody = document.getElementById('sertifikasi-table-body');
    if (!tbody) return;

    const list = Store.getAll('sertifikasi');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data sertifikasi pendidik.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((s, idx) => {
      const guru = Store.getById('guru', s.guru_id) || {};

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NIP: ${guru.nip || '-'}</small>
          </td>
          <td>
            <div class="fw-bold text-success"><i class="bi bi-patch-check-fill me-1"></i>${s.bidang_studi}</div>
            <small class="text-muted">Tahun: <strong>${s.tahun_sertifikasi}</strong></small>
          </td>
          <td>${s.lptk_penyelenggara}</td>
          <td>${s.nomor_sertifikat}</td>
          <td><small class="text-muted">${s.nomor_registrasi_guru || '-'}</small></td>
          <td class="text-center"><span class="badge bg-success">${s.status_berlaku}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-danger" onclick="SertifikasiPage.deleteSertifikasi('${s.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.renderGuruSelect();
    const form = document.getElementById('form-sertifikasi');
    if (form) form.reset();
    new bootstrap.Modal(document.getElementById('modal-sertifikasi')).show();
  },

  async saveSertifikasi(formEl) {
    const formData = new FormData(formEl);
    const payload = {
      guru_id: formData.get('guru_id'),
      bidang_studi: formData.get('bidang_studi'),
      tahun_sertifikasi: parseInt(formData.get('tahun_sertifikasi')) || 2020,
      lptk_penyelenggara: formData.get('lptk_penyelenggara'),
      nomor_sertifikat: formData.get('nomor_sertifikat'),
      nomor_registrasi_guru: formData.get('nomor_registrasi_guru') || null,
      status_berlaku: formData.get('status_berlaku') || 'Aktif'
    };

    try {
      await Store.insert('sertifikasi', payload);
      Toast.success('Berhasil', 'Data sertifikasi berhasil disimpan.');
      bootstrap.Modal.getInstance(document.getElementById('modal-sertifikasi'))?.hide();
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  async deleteSertifikasi(id) {
    if (!confirm('Hapus data sertifikasi ini?')) return;
    try {
      await Store.delete('sertifikasi', id);
      Toast.success('Dihapus', 'Data sertifikasi berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  }
};
