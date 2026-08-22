/**
 * ============================================================================
 * PELATIHAN & PMM PAGE MODULE
 * APDAGU Enterprise v2.0
 * PMM, Guru Penggerak, Workshop, Webinar, Diklat
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';

export const PelatihanPage = {
  init() {
    this.renderGuruSelect();
    this.render();
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-pelatihan-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  render() {
    const tbody = document.getElementById('pelatihan-table-body');
    if (!tbody) return;

    const list = Store.getAll('pelatihan');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data pelatihan / PMM.</td></tr>`;
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
          <td>
            <div class="fw-bold text-primary">${p.nama_pelatihan}</div>
            <small class="text-muted">${p.penyelenggara}</small>
          </td>
          <td><span class="badge bg-light text-dark border">${p.jenis_pelatihan}</span></td>
          <td class="text-center fw-bold">${p.pola_jp} JP</td>
          <td>
            <div>${Helpers.formatDate(p.tanggal_mulai)}</div>
            <small class="text-muted">s.d ${Helpers.formatDate(p.tanggal_selesai)}</small>
          </td>
          <td><small class="text-muted">${p.nomor_sertifikat || '-'}</small></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-danger" onclick="PelatihanPage.deletePelatihan('${p.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.renderGuruSelect();
    const form = document.getElementById('form-pelatihan');
    if (form) form.reset();
    new bootstrap.Modal(document.getElementById('modal-pelatihan')).show();
  },

  async savePelatihan(formEl) {
    const formData = new FormData(formEl);
    const payload = {
      guru_id: formData.get('guru_id'),
      nama_pelatihan: formData.get('nama_pelatihan'),
      jenis_pelatihan: formData.get('jenis_pelatihan') || 'Pelatihan Mandiri PMM',
      penyelenggara: formData.get('penyelenggara'),
      pola_jp: parseInt(formData.get('pola_jp')) || 32,
      tanggal_mulai: formData.get('tanggal_mulai'),
      tanggal_selesai: formData.get('tanggal_selesai'),
      tahun: parseInt(formData.get('tahun')) || new Date().getFullYear(),
      nomor_sertifikat: formData.get('nomor_sertifikat') || null
    };

    try {
      await Store.insert('pelatihan', payload);
      Toast.success('Berhasil', 'Data pelatihan berhasil disimpan.');
      bootstrap.Modal.getInstance(document.getElementById('modal-pelatihan'))?.hide();
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  async deletePelatihan(id) {
    if (!confirm('Hapus riwayat pelatihan ini?')) return;
    try {
      await Store.delete('pelatihan', id);
      Toast.success('Dihapus', 'Data pelatihan berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  }
};
