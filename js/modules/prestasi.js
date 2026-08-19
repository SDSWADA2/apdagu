/**
 * ============================================================================
 * MODUL PRESTASI GURU & SISWA BINAAN (DISEMPURNAKAN)
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const PrestasiModule = {
  filterTingkat: 'all',
  filterKategori: 'all',

  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderList();
  },

  bindEvents() {
    const form = document.getElementById('form-prestasi');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePrestasi();
      });
    }
  },

  renderGuruSelect() {
    const formSelect = document.getElementById('form-prestasi-guru-id');
    if (!formSelect) return;
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    formSelect.innerHTML = `<option value="">-- Pilih Guru --</option>` + 
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  renderList() {
    const tbody = document.getElementById('prestasi-table-body');
    if (!tbody) return;

    let list = DB.getAll('prestasi');
    if (this.filterTingkat !== 'all') list = list.filter(p => p.tingkat === this.filterTingkat);
    if (this.filterKategori !== 'all') list = list.filter(p => p.kategori === this.filterKategori);

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data catatan prestasi.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((p, idx) => {
      const guru = DB.getById('guru', p.guru_id) || {};
      const badgeTingkat = p.tingkat === 'Nasional' || p.tingkat === 'Internasional' ? 'bg-danger' : (p.tingkat === 'Pamekasan' ? 'bg-primary' : 'bg-success');

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${Helpers.formatNamaGelar(guru)}</div>
            <small class="badge bg-light text-dark border">${p.kategori}</small>
          </td>
          <td><strong>${p.nama_prestasi}</strong></td>
          <td><span class="badge ${badgeTingkat}">${p.tingkat}</span></td>
          <td><strong class="text-warning text-dark px-2 py-1 rounded bg-warning-subtle">${p.peringkat_juara || '-'}</strong></td>
          <td class="text-center"><strong>${p.tahun}</strong></td>
          <td><small class="text-muted">${p.penyelenggara || '-'}</small></td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-warning p-1" onclick="PrestasiModule.openEditModal(${p.id})" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger p-1" onclick="PrestasiModule.deletePrestasi(${p.id})" title="Hapus"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-prestasi');
    if (!form) return;
    form.reset();
    document.getElementById('form-prestasi-id').value = '';
    document.getElementById('form-prestasi-tahun').value = new Date().getFullYear();
    document.getElementById('modal-prestasi-title').textContent = 'Tambah Prestasi Guru / Siswa Binaan';
    this.renderGuruSelect();

    const modal = new bootstrap.Modal(document.getElementById('modal-prestasi-form'));
    modal.show();
  },

  openEditModal(id) {
    const item = DB.getById('prestasi', id);
    if (!item) return;

    this.renderGuruSelect();
    document.getElementById('modal-prestasi-title').textContent = 'Edit Data Prestasi';
    document.getElementById('form-prestasi-id').value = item.id;
    document.getElementById('form-prestasi-guru-id').value = item.guru_id;
    document.getElementById('form-prestasi-kategori').value = item.kategori || 'Guru Berprestasi';
    document.getElementById('form-prestasi-tingkat').value = item.tingkat || 'Kabupaten';
    document.getElementById('form-prestasi-nama').value = item.nama_prestasi || '';
    document.getElementById('form-prestasi-juara').value = item.peringkat_juara || '';
    document.getElementById('form-prestasi-tahun').value = item.tahun || new Date().getFullYear();
    document.getElementById('form-prestasi-penyelenggara').value = item.penyelenggara || '';
    document.getElementById('form-prestasi-piagam').value = item.nomor_piagam || '';

    const modal = new bootstrap.Modal(document.getElementById('modal-prestasi-form'));
    modal.show();
  },

  savePrestasi() {
    const id = document.getElementById('form-prestasi-id').value;
    const guruId = parseInt(document.getElementById('form-prestasi-guru-id').value);
    const namaPrestasi = document.getElementById('form-prestasi-nama').value.trim();

    if (!guruId || !namaPrestasi) {
      if (typeof App !== 'undefined') App.showToast('Validasi Gagal', 'Pilih guru dan masukkan nama prestasi!', 'warning');
      return;
    }

    const data = {
      guru_id: guruId,
      kategori: document.getElementById('form-prestasi-kategori').value,
      tingkat: document.getElementById('form-prestasi-tingkat').value,
      nama_prestasi: namaPrestasi,
      peringkat_juara: document.getElementById('form-prestasi-juara').value.trim(),
      tahun: parseInt(document.getElementById('form-prestasi-tahun').value) || new Date().getFullYear(),
      penyelenggara: document.getElementById('form-prestasi-penyelenggara').value.trim(),
      nomor_piagam: document.getElementById('form-prestasi-piagam').value.trim()
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';

    if (!id) {
      DB.insert('prestasi', data, `Menambah data prestasi (${data.nama_prestasi}) untuk ${namaGuru}`);
      App.showToast('Sukses', 'Data prestasi berhasil ditambahkan.', 'success');
    } else {
      DB.update('prestasi', id, data, `Mengubah data prestasi untuk ${namaGuru}`);
      App.showToast('Sukses', 'Data prestasi berhasil diperbarui.', 'success');
    }

    const modalEl = document.getElementById('modal-prestasi-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderList();
  },

  deletePrestasi(id) {
    if (typeof App !== 'undefined' && App.showConfirm) {
      App.showConfirm(
        'Hapus Prestasi?', 
        'Data prestasi ini akan dihapus permanen. Lanjutkan?', 
        () => {
          DB.delete('prestasi', id, 'Menghapus data prestasi');
          this.renderList();
          App.showToast('Dihapus', 'Data prestasi telah dihapus.', 'info');
        }
      );
    } else {
      if (confirm('Hapus data prestasi ini?')) {
        DB.delete('prestasi', id, 'Menghapus data prestasi');
        this.renderList();
        if (typeof App !== 'undefined') App.showToast('Dihapus', 'Data prestasi telah dihapus.', 'info');
      }
    }
  },

  printPrestasi() {
    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    const list = DB.getAll('prestasi');
    const profil = DB.state.profil_sekolah || {};

    const rows = list.map((p, idx) => {
      const g = DB.getById('guru', p.guru_id) || {};
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px;"><strong>${Helpers.formatNamaGelar(g)}</strong></td>
          <td style="border: 1px solid #000; padding: 5px;">${p.nama_prestasi}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${p.kategori}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px; font-weight: bold;">${p.tingkat}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${p.peringkat_juara}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${p.tahun}</td>
          <td style="border: 1px solid #000; padding: 5px;"><small>${p.penyelenggara || '-'}</small></td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-3">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">REKAPITULASI PRESTASI GURU & SISWA BINAAN</h4>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">No</th>
            <th style="border: 1px solid #000; padding: 6px;">Nama Guru</th>
            <th style="border: 1px solid #000; padding: 6px;">Nama Prestasi / Event</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Kategori</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Tingkat</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Juara</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Tahun</th>
            <th style="border: 1px solid #000; padding: 6px;">Penyelenggara</th>
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
    const list = DB.getAll('prestasi');
    const data = list.map((p, idx) => {
      const g = DB.getById('guru', p.guru_id) || {};
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'Nama Prestasi': p.nama_prestasi,
        'Kategori': p.kategori,
        'Tingkat': p.tingkat,
        'Peringkat': p.peringkat_juara,
        'Tahun': p.tahun,
        'Penyelenggara': p.penyelenggara || '-',
        'Nomor Piagam': p.nomor_piagam || '-'
      };
    });
    ExportUtils.exportToExcel(data, 'Rekap_Prestasi_Guru_SDN_Sumber_Waru_2', 'Prestasi');
    App.showToast('Ekspor Berhasil', 'Data prestasi telah diekspor ke Excel.', 'success');
  }
};
