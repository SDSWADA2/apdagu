/**
 * ============================================================================
 * JADWAL MENGAJAR PAGE MODULE
 * APDAGU Enterprise v2.0
 * Jadwal Pelajaran, Kelas, Hari, Jam ke, JP
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';

export const JadwalPage = {
  filterHari: 'all',

  init() {
    this.renderGuruSelect();
    this.render();
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-jadwal-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  render() {
    const tbody = document.getElementById('jadwal-table-body');
    if (!tbody) return;

    let list = Store.getAll('jadwal_mengajar');
    if (this.filterHari !== 'all') {
      list = list.filter(j => j.hari === this.filterHari);
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada jadwal mengajar.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((j, idx) => {
      const guru = Store.getById('guru', j.guru_id) || {};

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td class="fw-bold">${j.hari}</td>
          <td class="text-center">${j.jam_ke}</td>
          <td class="text-center">${j.waktu_mulai?.slice(0,5)} - ${j.waktu_selesai?.slice(0,5)}</td>
          <td class="text-center fw-bold text-primary">${j.kelas}</td>
          <td>${j.mata_pelajaran}</td>
          <td>
            <div>${Helpers.formatNamaGelar(guru)}</div>
          </td>
          <td class="text-center fw-bold">${j.jumlah_jp} JP</td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-danger" onclick="JadwalPage.deleteJadwal('${j.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.renderGuruSelect();
    const form = document.getElementById('form-jadwal');
    if (form) form.reset();
    new bootstrap.Modal(document.getElementById('modal-jadwal')).show();
  },

  async saveJadwal(formEl) {
    const formData = new FormData(formEl);
    const payload = {
      guru_id: formData.get('guru_id'),
      hari: formData.get('hari'),
      jam_ke: formData.get('jam_ke'),
      waktu_mulai: formData.get('waktu_mulai'),
      waktu_selesai: formData.get('waktu_selesai'),
      kelas: formData.get('kelas'),
      mata_pelajaran: formData.get('mata_pelajaran'),
      jumlah_jp: parseInt(formData.get('jumlah_jp')) || 2
    };

    try {
      await Store.insert('jadwal_mengajar', payload);
      Toast.success('Berhasil', 'Jadwal mengajar berhasil disimpan.');
      bootstrap.Modal.getInstance(document.getElementById('modal-jadwal'))?.hide();
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  async deleteJadwal(id) {
    if (!confirm('Hapus jadwal ini?')) return;
    try {
      await Store.delete('jadwal_mengajar', id);
      Toast.success('Dihapus', 'Jadwal berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  }
};
