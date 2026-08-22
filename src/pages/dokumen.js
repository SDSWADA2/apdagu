/**
 * ============================================================================
 * DOKUMEN & BERKAS PAGE MODULE
 * APDAGU Enterprise v2.0
 * PDF Preview, Upload to Supabase Storage, Filter Kategori, Expired Reminder
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Storage } from '../services/storage.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';

export const DokumenPage = {
  filterKategori: 'all',

  init() {
    this.renderGuruSelect();
    this.render();
  },

  renderGuruSelect() {
    const sel = document.getElementById('form-dokumen-guru-id');
    if (!sel) return;
    const guruList = Store.getAll('guru');
    sel.innerHTML = `<option value="">-- Pilih Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  render() {
    const tbody = document.getElementById('dokumen-table-body');
    if (!tbody) return;

    let list = Store.getAll('dokumen');
    if (this.filterKategori !== 'all') {
      list = list.filter(d => d.kategori_dokumen === this.filterKategori);
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada dokumen yang diunggah.</td></tr>`;
      return;
    }

    const now = new Date();
    tbody.innerHTML = list.map((d, idx) => {
      const guru = Store.getById('guru', d.guru_id) || {};
      let expiredBadge = '<span class="badge bg-success">Berlaku</span>';

      if (d.tanggal_kadaluarsa) {
        const exp = new Date(d.tanggal_kadaluarsa);
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          expiredBadge = '<span class="badge bg-danger">Kadaluarsa</span>';
        } else if (diffDays <= 30) {
          expiredBadge = `<span class="badge bg-warning text-dark">${diffDays} Hari Lagi</span>`;
        }
      }

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NIP: ${guru.nip || '-'}</small>
          </td>
          <td><span class="badge bg-light text-dark border">${d.kategori_dokumen}</span></td>
          <td>
            <div class="fw-semibold text-primary">${d.nama_dokumen}</div>
            <small class="text-muted">No: ${d.nomor_dokumen || '-'}</small>
          </td>
          <td class="text-center">
            <div>${d.tanggal_kadaluarsa ? Helpers.formatDate(d.tanggal_kadaluarsa) : 'Seumur Hidup'}</div>
            ${expiredBadge}
          </td>
          <td><small class="text-muted">${d.ukuran_file_kb ? `${d.ukuran_file_kb} KB` : '-'}</small></td>
          <td class="text-center">
            <div class="btn-group btn-group-sm">
              <a href="${d.file_url}" target="_blank" class="btn btn-outline-primary" title="Buka"><i class="bi bi-eye"></i></a>
              <button class="btn btn-outline-danger" onclick="DokumenPage.deleteDokumen('${d.id}')" title="Hapus"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    this.renderGuruSelect();
    const form = document.getElementById('form-dokumen');
    if (form) form.reset();
    new bootstrap.Modal(document.getElementById('modal-dokumen')).show();
  },

  async saveDokumen(formEl) {
    const formData = new FormData(formEl);
    const file = document.getElementById('form-dokumen-file')?.files?.[0];
    if (!file) {
      Toast.error('Gagal', 'Pilih file dokumen terlebih dahulu.');
      return;
    }

    try {
      Toast.info('Mengunggah', 'Sedang mengunggah dokumen ke Supabase Storage...');
      const uploadRes = await Storage.uploadFile('dokumen', file);

      const payload = {
        guru_id: formData.get('guru_id'),
        kategori_dokumen: formData.get('kategori_dokumen'),
        nama_dokumen: formData.get('nama_dokumen'),
        nomor_dokumen: formData.get('nomor_dokumen') || null,
        tanggal_terbit: formData.get('tanggal_terbit') || null,
        tanggal_kadaluarsa: formData.get('tanggal_kadaluarsa') || null,
        file_url: uploadRes.url,
        ukuran_file_kb: Math.round(file.size / 1024),
        keterangan: formData.get('keterangan') || null
      };

      await Store.insert('dokumen', payload);
      Toast.success('Berhasil', 'Dokumen berhasil diunggah.');
      bootstrap.Modal.getInstance(document.getElementById('modal-dokumen'))?.hide();
      this.render();
    } catch (e) {
      Toast.error('Gagal Mengunggah', e.message);
    }
  },

  async deleteDokumen(id) {
    if (!confirm('Hapus dokumen ini?')) return;
    try {
      await Store.delete('dokumen', id);
      Toast.success('Dihapus', 'Dokumen berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  }
};
