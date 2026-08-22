/**
 * ============================================================================
 * PENDIDIKAN PAGE MODULE
 * APDAGU Enterprise v2.0
 * Riwayat Pendidikan Formal Guru (S1, S2, D3, dll)
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';

export const PendidikanPage = {
  init() {
    this.renderGuruSelect();
    this.render();
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-pendidikan-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  render() {
    const tbody = document.getElementById('pendidikan-table-body');
    if (!tbody) return;

    const list = Store.getAll('pendidikan');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data riwayat pendidikan.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((p, idx) => {
      const guru = Store.getById('guru', p.guru_id) || {};

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NIP: ${guru.nip || '-'}</small>
          </td>
          <td><span class="badge bg-info text-dark">${p.jenjang}</span></td>
          <td>
            <div class="fw-semibold text-primary">${p.nama_institusi}</div>
            <small class="text-muted">${p.fakultas || '-'}</small>
          </td>
          <td>${p.program_studi}</td>
          <td class="text-center">${p.tahun_masuk} - ${p.tahun_lulus}</td>
          <td class="text-center fw-bold">${p.ipk || '-'}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-danger" onclick="PendidikanPage.deletePendidikan('${p.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.renderGuruSelect();
    const form = document.getElementById('form-pendidikan');
    if (form) form.reset();
    new bootstrap.Modal(document.getElementById('modal-pendidikan')).show();
  },

  async savePendidikan(formEl) {
    const formData = new FormData(formEl);
    const payload = {
      guru_id: formData.get('guru_id'),
      jenjang: formData.get('jenjang'),
      nama_institusi: formData.get('nama_institusi'),
      fakultas: formData.get('fakultas') || null,
      program_studi: formData.get('program_studi'),
      tahun_masuk: parseInt(formData.get('tahun_masuk')) || 2010,
      tahun_lulus: parseInt(formData.get('tahun_lulus')) || 2014,
      ipk: parseFloat(formData.get('ipk')) || null,
      nomor_ijazah: formData.get('nomor_ijazah') || null
    };

    try {
      await Store.insert('pendidikan', payload);
      Toast.success('Berhasil', 'Riwayat pendidikan berhasil disimpan.');
      bootstrap.Modal.getInstance(document.getElementById('modal-pendidikan'))?.hide();
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  async deletePendidikan(id) {
    if (!confirm('Hapus riwayat pendidikan ini?')) return;
    try {
      await Store.delete('pendidikan', id);
      Toast.success('Dihapus', 'Data pendidikan berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  }
};
