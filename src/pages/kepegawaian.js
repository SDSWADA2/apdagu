/**
 * ============================================================================
 * KEPEGAWAIAN PAGE MODULE
 * APDAGU Enterprise v2.0
 * Status Kepegawaian (PNS, PPPK, Honorer), Pangkat/Golongan, SK Pengangkatan
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';
import { ExportUtils } from '../utils/export_utils.js';

export const KepegawaianPage = {
  init() {
    this.renderGuruSelect();
    this.render();
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-kepegawaian-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  render() {
    const tbody = document.getElementById('kepegawaian-table-body');
    if (!tbody) return;

    const list = Store.getAll('kepegawaian');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data kepegawaian.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((k, idx) => {
      const guru = Store.getById('guru', k.guru_id) || {};

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NIP: ${guru.nip || '-'}</small>
          </td>
          <td><span class="badge bg-primary fs-7">${k.status_kepegawaian}</span></td>
          <td>${k.jabatan}</td>
          <td class="text-center">${k.pangkat_golongan || '-'}</td>
          <td>${Helpers.formatDate(k.tmt_pengangkatan)}</td>
          <td><small class="text-muted">${k.nomor_sk || '-'}</small></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-danger" onclick="KepegawaianPage.deleteKepegawaian('${k.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.renderGuruSelect();
    const form = document.getElementById('form-kepegawaian');
    if (form) form.reset();
    new bootstrap.Modal(document.getElementById('modal-kepegawaian')).show();
  },

  async saveKepegawaian(formEl) {
    const formData = new FormData(formEl);
    const payload = {
      guru_id: formData.get('guru_id'),
      status_kepegawaian: formData.get('status_kepegawaian'),
      jabatan: formData.get('jabatan'),
      pangkat_golongan: formData.get('pangkat_golongan') || null,
      tmt_pengangkatan: formData.get('tmt_pengangkatan'),
      nomor_sk: formData.get('nomor_sk') || null,
      gaji_pokok: parseFloat(formData.get('gaji_pokok')) || 0
    };

    try {
      await Store.insert('kepegawaian', payload);
      Toast.success('Berhasil', 'Data kepegawaian berhasil disimpan.');
      bootstrap.Modal.getInstance(document.getElementById('modal-kepegawaian'))?.hide();
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  async deleteKepegawaian(id) {
    if (!confirm('Hapus data kepegawaian ini?')) return;
    try {
      await Store.delete('kepegawaian', id);
      Toast.success('Dihapus', 'Data kepegawaian berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  exportExcel() {
    const data = Store.getAll('kepegawaian').map((k, i) => {
      const guru = Store.getById('guru', k.guru_id) || {};
      return {
        No: i + 1,
        Nama_Guru: Helpers.formatNamaGelar(guru),
        NIP: guru.nip || '',
        Status_Kepegawaian: k.status_kepegawaian,
        Jabatan: k.jabatan,
        Pangkat_Golongan: k.pangkat_golongan || '',
        TMT_Pengangkatan: k.tmt_pengangkatan,
        Nomor_SK: k.nomor_sk || ''
      };
    });
    ExportUtils.exportToExcel(data, 'Data_Kepegawaian_Guru', 'Kepegawaian');
  }
};
