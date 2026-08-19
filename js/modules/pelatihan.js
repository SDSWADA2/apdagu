/**
 * ============================================================================
 * MODUL PELATIHAN & PMM (PENGEMBANGAN KEPROFESIAN BERKELANJUTAN / PKB) (DISEMPURNAKAN)
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const PelatihanModule = {
  filterJenis: 'all',

  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderList();
  },

  bindEvents() {
    const form = document.getElementById('form-pelatihan');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePelatihan();
      });
    }
  },

  renderGuruSelect() {
    const formSelect = document.getElementById('form-pelatihan-guru-id');
    if (!formSelect) return;
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    formSelect.innerHTML = `<option value="">-- Pilih Guru --</option>` + 
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  renderList() {
    const tbody = document.getElementById('pelatihan-table-body');
    if (!tbody) return;

    let list = DB.getAll('pelatihan');
    if (this.filterJenis !== 'all') list = list.filter(p => p.jenis_pelatihan === this.filterJenis);

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data riwayat pelatihan.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((p, idx) => {
      const guru = DB.getById('guru', p.guru_id) || {};
      const badgePola = p.pola_jp >= 32 ? 'bg-primary' : 'bg-info';

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NUPTK: ${guru.nuptk || '-'}</small>
          </td>
          <td><strong>${p.nama_pelatihan}</strong></td>
          <td><span class="badge bg-light text-dark border">${p.jenis_pelatihan}</span></td>
          <td class="text-center"><span class="badge ${badgePola}">${p.pola_jp || 32} JP</span></td>
          <td class="text-center"><strong>${p.tahun}</strong></td>
          <td><small class="text-muted">${p.penyelenggara || '-'}</small></td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-warning p-1" onclick="PelatihanModule.openEditModal(${p.id})" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger p-1" onclick="PelatihanModule.deletePelatihan(${p.id})" title="Hapus"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-pelatihan');
    if (!form) return;
    form.reset();
    document.getElementById('form-pelatihan-id').value = '';
    document.getElementById('form-pelatihan-tahun').value = new Date().getFullYear();
    document.getElementById('form-pelatihan-jp').value = 32;
    document.getElementById('form-pelatihan-penyelenggara').value = 'Kemendikbudristek RI';
    document.getElementById('modal-pelatihan-title').textContent = 'Tambah Riwayat Pelatihan / PMM';
    this.renderGuruSelect();

    const modal = new bootstrap.Modal(document.getElementById('modal-pelatihan-form'));
    modal.show();
  },

  openEditModal(id) {
    const item = DB.getById('pelatihan', id);
    if (!item) return;

    this.renderGuruSelect();
    document.getElementById('modal-pelatihan-title').textContent = 'Edit Riwayat Pelatihan';
    document.getElementById('form-pelatihan-id').value = item.id;
    document.getElementById('form-pelatihan-guru-id').value = item.guru_id;
    document.getElementById('form-pelatihan-nama').value = item.nama_pelatihan || '';
    document.getElementById('form-pelatihan-jenis').value = item.jenis_pelatihan || 'Pelatihan Mandiri PMM';
    document.getElementById('form-pelatihan-jp').value = item.pola_jp || 32;
    document.getElementById('form-pelatihan-penyelenggara').value = item.penyelenggara || '';
    document.getElementById('form-pelatihan-mulai').value = item.tanggal_mulai || '';
    document.getElementById('form-pelatihan-selesai').value = item.tanggal_selesai || '';
    document.getElementById('form-pelatihan-tahun').value = item.tahun || new Date().getFullYear();
    document.getElementById('form-pelatihan-sertifikat').value = item.nomor_sertifikat || '';

    const modal = new bootstrap.Modal(document.getElementById('modal-pelatihan-form'));
    modal.show();
  },

  savePelatihan() {
    const id = document.getElementById('form-pelatihan-id').value;
    const guruId = parseInt(document.getElementById('form-pelatihan-guru-id').value);
    const namaPelatihan = document.getElementById('form-pelatihan-nama').value.trim();

    if (!guruId || !namaPelatihan) {
      if (typeof App !== 'undefined') App.showToast('Validasi Gagal', 'Pilih guru dan masukkan nama pelatihan!', 'warning');
      return;
    }

    const data = {
      guru_id: guruId,
      nama_pelatihan: namaPelatihan,
      jenis_pelatihan: document.getElementById('form-pelatihan-jenis').value,
      pola_jp: parseInt(document.getElementById('form-pelatihan-jp').value) || 32,
      penyelenggara: document.getElementById('form-pelatihan-penyelenggara').value.trim(),
      tanggal_mulai: document.getElementById('form-pelatihan-mulai').value,
      tanggal_selesai: document.getElementById('form-pelatihan-selesai').value,
      tahun: parseInt(document.getElementById('form-pelatihan-tahun').value) || new Date().getFullYear(),
      nomor_sertifikat: document.getElementById('form-pelatihan-sertifikat').value.trim()
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';

    if (!id) {
      DB.insert('pelatihan', data, `Menambah riwayat pelatihan untuk ${namaGuru}`);
      App.showToast('Sukses', 'Riwayat pelatihan berhasil ditambahkan.', 'success');
    } else {
      DB.update('pelatihan', id, data, `Mengubah riwayat pelatihan untuk ${namaGuru}`);
      App.showToast('Sukses', 'Riwayat pelatihan berhasil diperbarui.', 'success');
    }

    const modalEl = document.getElementById('modal-pelatihan-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderList();
  },

  deletePelatihan(id) {
    if (typeof App !== 'undefined' && App.showConfirm) {
      App.showConfirm(
        'Hapus Pelatihan?', 
        'Data pelatihan ini akan dihapus permanen. Lanjutkan?', 
        () => {
          DB.delete('pelatihan', id, 'Menghapus data pelatihan');
          this.renderList();
          App.showToast('Dihapus', 'Data pelatihan telah dihapus.', 'info');
        }
      );
    } else {
      if (confirm('Hapus data pelatihan ini?')) {
        DB.delete('pelatihan', id, 'Menghapus data pelatihan');
        this.renderList();
        if (typeof App !== 'undefined') App.showToast('Dihapus', 'Data pelatihan telah dihapus.', 'info');
      }
    }
  },

  printPelatihan() {
    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    const list = DB.getAll('pelatihan');
    const profil = DB.state.profil_sekolah || {};

    const rows = list.map((p, idx) => {
      const g = DB.getById('guru', p.guru_id) || {};
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px;"><strong>${Helpers.formatNamaGelar(g)}</strong></td>
          <td style="border: 1px solid #000; padding: 5px;">${p.nama_pelatihan}</td>
          <td style="border: 1px solid #000; padding: 5px;">${p.jenis_pelatihan}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px; font-weight: bold;">${p.pola_jp} JP</td>
          <td style="border: 1px solid #000; padding: 5px;">${p.penyelenggara}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${p.tahun}</td>
          <td style="border: 1px solid #000; padding: 5px;"><small>${p.nomor_sertifikat || '-'}</small></td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-3">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">REKAPITULASI PELATIHAN & PENGEMBANGAN KEPROFESIAN BERKELANJUTAN (PKB)</h4>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">No</th>
            <th style="border: 1px solid #000; padding: 6px;">Nama Guru</th>
            <th style="border: 1px solid #000; padding: 6px;">Nama Pelatihan / Diklat / PMM</th>
            <th style="border: 1px solid #000; padding: 6px;">Jenis Kegiatan</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Pola JP</th>
            <th style="border: 1px solid #000; padding: 6px;">Penyelenggara</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Tahun</th>
            <th style="border: 1px solid #000; padding: 6px;">No. Sertifikat</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-top: 30px; page-break-inside: avoid;">
        ${App.getTandaTanganKS(Helpers.formatDateIndo(new Date().toISOString().slice(0, 10)))}
      </div>
    `;

    window.print();
  },

  exportExcel() {
    const list = DB.getAll('pelatihan');
    const data = list.map((p, idx) => {
      const g = DB.getById('guru', p.guru_id) || {};
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'Nama Pelatihan': p.nama_pelatihan,
        'Jenis Kegiatan': p.jenis_pelatihan,
        'Pola JP': p.pola_jp,
        'Penyelenggara': p.penyelenggara || '-',
        'Tahun': p.tahun,
        'Nomor Sertifikat': p.nomor_sertifikat || '-'
      };
    });
    ExportUtils.exportToExcel(data, 'Rekap_Pelatihan_PMM_Guru_SDN_Sumber_Waru_2', 'Pelatihan PMM');
    App.showToast('Ekspor Berhasil', 'Data pelatihan telah diekspor ke Excel.', 'success');
  }
};
