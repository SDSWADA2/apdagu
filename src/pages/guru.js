/**
 * ============================================================================
 * GURU PAGE MODULE (MASTER DATA)
 * APDAGU Enterprise v2.0
 * Fast Search (<100ms), Filter, Pagination, Bulk Selection, Import & Export
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Auth } from '../services/auth.js';
import { Storage } from '../services/storage.js';
import { Helpers } from '../utils/helpers.js';
import { Toast } from '../utils/toast.js';
import { ExportUtils } from '../utils/export_utils.js';

export const GuruPage = {
  searchQuery: '',
  filterStatus: 'all',
  filterJenisKelamin: 'all',
  currentPage: 1,
  pageSize: 10,
  selectedIds: new Set(),

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const searchInput = document.getElementById('guru-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', Helpers.debounce((e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        this.render();
      }, 80));
    }

    const filterStatus = document.getElementById('guru-filter-status');
    if (filterStatus) {
      filterStatus.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.currentPage = 1;
        this.render();
      });
    }

    const selectAll = document.getElementById('guru-select-all');
    if (selectAll) {
      selectAll.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.guru-checkbox');
        checkboxes.forEach(cb => {
          cb.checked = e.target.checked;
          if (e.target.checked) this.selectedIds.add(cb.value);
          else this.selectedIds.delete(cb.value);
        });
        this.updateBulkActionBar();
      });
    }
  },

  getFilteredData() {
    let list = Store.getAll('guru');
    if (this.searchQuery) {
      list = list.filter(g =>
        (g.nama_lengkap && g.nama_lengkap.toLowerCase().includes(this.searchQuery)) ||
        (g.nip && g.nip.includes(this.searchQuery)) ||
        (g.nuptk && g.nuptk.includes(this.searchQuery)) ||
        (g.nik && g.nik.includes(this.searchQuery))
      );
    }
    if (this.filterStatus !== 'all') {
      list = list.filter(g => g.status_keaktifan === this.filterStatus);
    }
    return list;
  },

  render() {
    const tbody = document.getElementById('guru-table-body');
    if (!tbody) return;

    const data = this.getFilteredData();
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    const paged = data.slice(start, start + this.pageSize);

    if (paged.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>Tidak ada data guru ditemukan.</td></tr>`;
      this.renderPagination(0, 1);
      return;
    }

    const canEdit = Auth.isAdminOrOperator();
    const kepegList = Store.getAll('kepegawaian');

    tbody.innerHTML = paged.map((g, idx) => {
      const kepeg = kepegList.find(k => k.guru_id === g.id) || {};
      const statusBadge = g.status_keaktifan === 'Aktif' ? 'bg-success' : 'bg-secondary';
      const isChecked = this.selectedIds.has(g.id) ? 'checked' : '';

      return `
        <tr>
          <td class="text-center">
            <input type="checkbox" class="form-check-input guru-checkbox" value="${g.id}" ${isChecked} onchange="GuruPage.toggleSelect('${g.id}', this.checked)">
          </td>
          <td class="text-center text-muted fw-bold">${start + idx + 1}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <img src="${g.foto_url || Helpers.generateAvatarSvg(g.nama_lengkap)}" class="rounded-circle border" width="40" height="40" alt="">
              <div>
                <a href="#" class="fw-bold text-decoration-none text-primary" onclick="GuruPage.viewProfile('${g.id}'); return false;">
                  ${Helpers.formatNamaGelar(g)}
                </a>
                <div class="text-muted fs-8">${g.jenis_kelamin || '-'} &bull; ${g.agama || '-'}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="fw-semibold">NUPTK: ${g.nuptk || '-'}</div>
            <small class="text-muted">NIP: ${g.nip || '-'}</small>
          </td>
          <td>
            <span class="badge bg-light text-dark border">${kepeg.status_kepegawaian || 'Belum Diatur'}</span>
            <div class="fs-8 text-muted mt-1">${kepeg.jabatan || 'Guru'}</div>
          </td>
          <td>
            <div>${g.no_hp || '-'}</div>
            <small class="text-muted">${g.email || '-'}</small>
          </td>
          <td class="text-center">
            <span class="badge ${statusBadge}">${g.status_keaktifan || 'Aktif'}</span>
          </td>
          <td class="text-center">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="GuruPage.viewProfile('${g.id}')" title="Lihat Profil"><i class="bi bi-eye"></i></button>
              ${canEdit ? `<button class="btn btn-outline-warning" onclick="GuruPage.openEditModal('${g.id}')" title="Edit"><i class="bi bi-pencil"></i></button>` : ''}
              ${canEdit ? `<button class="btn btn-outline-danger" onclick="GuruPage.deleteGuru('${g.id}')" title="Hapus"><i class="bi bi-trash"></i></button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.renderPagination(totalItems, totalPages);
  },

  renderPagination(totalItems, totalPages) {
    const container = document.getElementById('guru-pagination');
    if (!container) return;

    let html = `<div class="d-flex justify-content-between align-items-center w-100 fs-7">
      <div>Menampilkan <strong>${Math.min(totalItems, (this.currentPage - 1) * this.pageSize + 1)}</strong> - <strong>${Math.min(totalItems, this.currentPage * this.pageSize)}</strong> dari <strong>${totalItems}</strong> guru</div>
      <ul class="pagination pagination-sm mb-0">
        <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
          <button class="page-link" onclick="GuruPage.setPage(${this.currentPage - 1})">&laquo;</button>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        html += `<li class="page-item ${i === this.currentPage ? 'active' : ''}">
          <button class="page-link" onclick="GuruPage.setPage(${i})">${i}</button>
        </li>`;
      }
    }

    html += `
        <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
          <button class="page-link" onclick="GuruPage.setPage(${this.currentPage + 1})">&raquo;</button>
        </li>
      </ul>
    </div>`;

    container.innerHTML = html;
  },

  setPage(page) {
    this.currentPage = page;
    this.render();
  },

  toggleSelect(id, checked) {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
    this.updateBulkActionBar();
  },

  updateBulkActionBar() {
    const bar = document.getElementById('guru-bulk-actions');
    const count = document.getElementById('guru-selected-count');
    if (!bar) return;
    if (this.selectedIds.size > 0) {
      bar.classList.remove('d-none');
      if (count) count.textContent = `${this.selectedIds.size} dipilih`;
    } else {
      bar.classList.add('d-none');
    }
  },

  viewProfile(guruId) {
    if (typeof window !== 'undefined' && window.App) {
      window.App.navigateTo('view-profil-guru', { guruId });
    }
  },

  openAddModal() {
    const form = document.getElementById('form-guru');
    if (form) form.reset();
    const idInput = document.getElementById('form-guru-id');
    if (idInput) idInput.value = '';
    const modal = new bootstrap.Modal(document.getElementById('modal-guru'));
    modal.show();
  },

  openEditModal(guruId) {
    const g = Store.getById('guru', guruId);
    if (!g) return;

    const setField = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setField('form-guru-id', g.id);
    setField('form-guru-nama', g.nama_lengkap);
    setField('form-guru-gelar-depan', g.gelar_depan);
    setField('form-guru-gelar-belakang', g.gelar_belakang);
    setField('form-guru-nuptk', g.nuptk);
    setField('form-guru-nip', g.nip);
    setField('form-guru-nik', g.nik);
    setField('form-guru-no-kk', g.no_kk);
    setField('form-guru-npwp', g.npwp);
    setField('form-guru-jk', g.jenis_kelamin);
    setField('form-guru-tempat-lahir', g.tempat_lahir);
    setField('form-guru-tanggal-lahir', g.tanggal_lahir);
    setField('form-guru-agama', g.agama);
    setField('form-guru-status-nikah', g.status_pernikahan);
    setField('form-guru-hp', g.no_hp);
    setField('form-guru-email', g.email);
    setField('form-guru-alamat', g.alamat_jalan);
    setField('form-guru-desa', g.desa_kelurahan);
    setField('form-guru-kecamatan', g.kecamatan);
    setField('form-guru-kabupaten', g.kabupaten_kota);
    setField('form-guru-provinsi', g.provinsi);
    setField('form-guru-kodepos', g.kode_pos);
    setField('form-guru-status', g.status_keaktifan);

    const modal = new bootstrap.Modal(document.getElementById('modal-guru'));
    modal.show();
  },

  async saveGuru(formEl) {
    const formData = new FormData(formEl);
    const id = formData.get('id');
    const fotoFile = document.getElementById('form-guru-foto')?.files?.[0];

    let foto_url = null;
    if (fotoFile) {
      try {
        const compressed = await Storage.compressImage(fotoFile);
        const uploadRes = await Storage.uploadFile('foto-guru', compressed);
        foto_url = uploadRes.url;
      } catch (err) {
        Toast.warning('Foto Gagal Diunggah', err.message);
      }
    }

    const payload = {
      nama_lengkap: formData.get('nama_lengkap'),
      gelar_depan: formData.get('gelar_depan'),
      gelar_belakang: formData.get('gelar_belakang'),
      nuptk: formData.get('nuptk') || null,
      nip: formData.get('nip') || null,
      nik: formData.get('nik') || null,
      no_kk: formData.get('no_kk') || null,
      npwp: formData.get('npwp') || null,
      jenis_kelamin: formData.get('jenis_kelamin'),
      tempat_lahir: formData.get('tempat_lahir'),
      tanggal_lahir: formData.get('tanggal_lahir'),
      agama: formData.get('agama'),
      status_pernikahan: formData.get('status_pernikahan'),
      no_hp: formData.get('no_hp'),
      email: formData.get('email'),
      alamat_jalan: formData.get('alamat_jalan'),
      desa_kelurahan: formData.get('desa_kelurahan') || 'Sumber Waru',
      kecamatan: formData.get('kecamatan') || 'Waru',
      kabupaten_kota: formData.get('kabupaten_kota') || 'Kabupaten Pamekasan',
      provinsi: formData.get('provinsi') || 'Jawa Timur',
      kode_pos: formData.get('kode_pos') || '69353',
      status_keaktifan: formData.get('status_keaktifan') || 'Aktif'
    };

    if (foto_url) payload.foto_url = foto_url;

    try {
      if (id) {
        payload.id = id;
        await Store.update('guru', payload);
        Toast.success('Berhasil', 'Data guru berhasil diperbarui.');
      } else {
        await Store.insert('guru', payload);
        Toast.success('Berhasil', 'Guru baru berhasil ditambahkan.');
      }
      bootstrap.Modal.getInstance(document.getElementById('modal-guru'))?.hide();
      this.render();
    } catch (e) {
      Toast.error('Gagal Menyimpan', e.message);
    }
  },

  async deleteGuru(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data guru ini?')) return;
    try {
      await Store.delete('guru', id);
      Toast.success('Dihapus', 'Data guru berhasil dihapus.');
      this.render();
    } catch (e) {
      Toast.error('Gagal Menghapus', e.message);
    }
  },

  exportExcel() {
    const list = this.getFilteredData().map((g, i) => ({
      No: i + 1,
      Nama_Lengkap: Helpers.formatNamaGelar(g),
      NUPTK: g.nuptk || '',
      NIP: g.nip || '',
      NIK: g.nik || '',
      Jenis_Kelamin: g.jenis_kelamin || '',
      Tempat_Lahir: g.tempat_lahir || '',
      Tanggal_Lahir: g.tanggal_lahir || '',
      Agama: g.agama || '',
      No_HP: g.no_hp || '',
      Email: g.email || '',
      Alamat: g.alamat_jalan || '',
      Status: g.status_keaktifan || 'Aktif'
    }));
    ExportUtils.exportToExcel(list, 'Data_Guru_SDN_Sumber_Waru_2', 'Data Guru');
  }
};
