/**
 * ============================================================================
 * PRESTASI GURU & SISWA PAGE MODULE
 * APDAGU Enterprise v2.0
 * Prestasi Guru, Pembimbing Siswa, Piagam Penghargaan
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';

export const PrestasiPage = {
  init() {
    this.renderGuruSelect();
    this.render();
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-prestasi-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  render() {
    const tbody = document.getElementById('prestasi-table-body');
    if (!tbody) return;

    const list = Store.getAll('prestasi');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data prestasi.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((p, idx) => {
      const guru = Store.getById('guru', p.guru_id) || {};

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold">${Helpers.formatNamaGelar(guru)}</div>
          </td>
          <td><span class="badge bg-light text-dark border">${p.kategori}</span></td>
          <td>
            <div class="fw-bold text-primary">${p.nama_prestasi}</div>
            <small class="text-muted">${p.penyelenggara}</small>
          </td>
          <td><span class="badge bg-success">${p.peringkat_juara}</span></td>
          <td>${p.tingkat}</td>
          <td class="text-center">${p.tahun}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-danger" onclick="PrestasiPage.deletePrestasi('${p.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.renderGuruSelect();
    const form = document.getElementById('form-prestasi');
    if (form) form.reset();
    new bootstrap.Modal(document.getElementById('modal-prestasi')).show();
  },

  async savePrestasi(formEl) {
    const formData = new FormData(formEl);
    const payload = {
      guru_id: formData.get('guru_id'),
      kategori: formData.get('kategori') || 'Guru Berprestasi',
      nama_prestasi: formData.get('nama_prestasi'),
      tingkat: formData.get('tingkat'),
      peringkat_juara: formData.get('peringkat_juara'),
      tahun: parseInt(formData.get('tahun')) || new Date().getFullYear(),
      penyelenggara: formData.get('penyelenggara'),
      nomor_piagam: formData.get('nomor_piagam') || null
    };

    try {
      await Store.insert('prestasi', payload);
      Toast.success('Berhasil', 'Data prestasi berhasil disimpan.');
      bootstrap.Modal.getInstance(document.getElementById('modal-prestasi'))?.hide();
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  async deletePrestasi(id) {
    if (!confirm('Hapus prestasi ini?')) return;
    try {
      await Store.delete('prestasi', id);
      Toast.success('Dihapus', 'Data prestasi berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  }
};
