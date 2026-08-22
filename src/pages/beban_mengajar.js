/**
 * ============================================================================
 * BEBAN MENGAJAR & VALIDASI 24 JP PAGE MODULE
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';
import { ExportUtils } from '../utils/export_utils.js';

export const BebanMengajarPage = {
  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.render();
  },

  bindEvents() {
    ['form-beban-jp-tatap', 'form-beban-jp-tugas', 'form-beban-jp-ekskul'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.calculateTotalJP());
    });
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-beban-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  calculateTotalJP() {
    const jp1 = parseInt(document.getElementById('form-beban-jp-tatap')?.value) || 0;
    const jp2 = parseInt(document.getElementById('form-beban-jp-tugas')?.value) || 0;
    const jp3 = parseInt(document.getElementById('form-beban-jp-ekskul')?.value) || 0;
    const total = jp1 + jp2 + jp3;

    const totalEl = document.getElementById('form-beban-total-jp');
    const validationEl = document.getElementById('form-beban-validation');

    if (totalEl) totalEl.textContent = `${total} JP / Minggu`;
    if (validationEl) {
      const val = Helpers.validate24JP(total);
      validationEl.className = `badge ${val.badge}`;
      validationEl.textContent = val.message;
    }
  },

  render() {
    const tbody = document.getElementById('beban-table-body');
    if (!tbody) return;

    const list = Store.getAll('beban_mengajar');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data beban mengajar.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((b, idx) => {
      const guru = Store.getById('guru', b.guru_id) || {};
      const total = (Number(b.jp_tatap_muka) || 0) + (Number(b.jp_tugas_tambahan) || 0) + (Number(b.jp_ekskul) || 0);
      const val = Helpers.validate24JP(total);

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NUPTK: ${guru.nuptk || '-'}</small>
          </td>
          <td class="text-center fw-bold">${b.jp_tatap_muka || 0} JP</td>
          <td>
            <div>${b.tugas_tambahan || '-'}</div>
            <small class="text-primary fw-bold">${b.jp_tugas_tambahan ? b.jp_tugas_tambahan + ' JP' : ''}</small>
          </td>
          <td>
            <div>${b.ekstrakurikuler || '-'}</div>
            <small class="text-info fw-bold">${b.jp_ekskul ? b.jp_ekskul + ' JP' : ''}</small>
          </td>
          <td class="text-center"><strong class="fs-6">${total} JP</strong></td>
          <td class="text-center">
            <span class="badge ${val.badge}"><i class="bi ${val.icon} me-1"></i>${val.status}</span>
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-danger" onclick="BebanMengajarPage.deleteBeban('${b.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.renderGuruSelect();
    const form = document.getElementById('form-beban');
    if (form) form.reset();
    this.calculateTotalJP();
    new bootstrap.Modal(document.getElementById('modal-beban')).show();
  },

  async saveBeban(formEl) {
    const formData = new FormData(formEl);
    const payload = {
      guru_id: formData.get('guru_id'),
      jp_tatap_muka: parseInt(formData.get('jp_tatap_muka')) || 0,
      tugas_tambahan: formData.get('tugas_tambahan') || null,
      jp_tugas_tambahan: parseInt(formData.get('jp_tugas_tambahan')) || 0,
      ekstrakurikuler: formData.get('ekstrakurikuler') || null,
      jp_ekskul: parseInt(formData.get('jp_ekskul')) || 0,
      keterangan: formData.get('keterangan') || null
    };

    try {
      await Store.insert('beban_mengajar', payload);
      Toast.success('Berhasil', 'Data beban mengajar berhasil disimpan.');
      bootstrap.Modal.getInstance(document.getElementById('modal-beban'))?.hide();
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  async deleteBeban(id) {
    if (!confirm('Hapus beban mengajar ini?')) return;
    try {
      await Store.delete('beban_mengajar', id);
      Toast.success('Dihapus', 'Data beban mengajar berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  exportExcel() {
    const list = Store.getAll('beban_mengajar').map((b, i) => {
      const guru = Store.getById('guru', b.guru_id) || {};
      const total = (Number(b.jp_tatap_muka) || 0) + (Number(b.jp_tugas_tambahan) || 0) + (Number(b.jp_ekskul) || 0);
      return {
        No: i + 1,
        Nama_Guru: Helpers.formatNamaGelar(guru),
        JP_Tatap_Muka: b.jp_tatap_muka || 0,
        Tugas_Tambahan: b.tugas_tambahan || '',
        JP_Tugas_Tambahan: b.jp_tugas_tambahan || 0,
        Ekstrakurikuler: b.ekstrakurikuler || '',
        JP_Ekskul: b.jp_ekskul || 0,
        Total_JP: total,
        Status_24_JP: total >= 24 ? 'Terpenuhi' : 'Belum Terpenuhi'
      };
    });
    ExportUtils.exportToExcel(list, 'Beban_Mengajar_24JP', 'Beban Mengajar');
  }
};
