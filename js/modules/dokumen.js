/**
 * ============================================================================
 * MODUL ARSIP DIGITAL & DOKUMEN KEPEGAWAIAN (DISEMPURNAKAN)
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const DokumenModule = {
  filterKategori: 'all',
  filterGuruId: 'all',

  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderList();
  },

  bindEvents() {
    const filterKat = document.getElementById('filter-dokumen-kategori');
    if (filterKat) {
      filterKat.addEventListener('change', (e) => {
        this.filterKategori = e.target.value;
        this.renderList();
      });
    }

    const form = document.getElementById('form-dokumen');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveDokumen();
      });
    }
  },

  renderGuruSelect() {
    const formSelect = document.getElementById('form-dokumen-guru-id');
    if (!formSelect) return;
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    formSelect.innerHTML = `<option value="">-- Pilih Guru Pemilik --</option>` + 
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  renderList() {
    const tbody = document.getElementById('dokumen-table-body');
    if (!tbody) return;

    let list = DB.getAll('dokumen');
    if (this.filterKategori !== 'all') list = list.filter(d => d.kategori_dokumen === this.filterKategori);

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada dokumen digital pada kategori ini.</td></tr>`;
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    tbody.innerHTML = list.map((d, idx) => {
      const guru = DB.getById('guru', d.guru_id) || {};
      const isExpired = d.tanggal_kadaluarsa && d.tanggal_kadaluarsa < today;

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NIP: ${guru.nip || '-'}</small>
          </td>
          <td><span class="badge bg-light text-dark border fw-bold">${d.kategori_dokumen}</span></td>
          <td>
            <div class="fw-bold text-primary">${d.nama_dokumen}</div>
            <small class="text-muted">${d.nomor_dokumen ? 'No: ' + d.nomor_dokumen : 'Tgl Terbit: ' + Helpers.formatDateIndo(d.tanggal_terbit)}</small>
          </td>
          <td><small class="text-muted">${d.file_name || 'berkas_scan.pdf'} (${d.file_size || '1.2 MB'})</small></td>
          <td>${Helpers.formatDateIndo(d.tanggal_unggah || d.tanggal_terbit)}</td>
          <td>
            ${d.tanggal_kadaluarsa ? (isExpired ? '<span class="badge bg-danger">Kadaluarsa</span>' : `<span class="badge bg-success">${Helpers.formatDateIndo(d.tanggal_kadaluarsa)}</span>`) : '<span class="badge bg-light text-muted border">Seumur Hidup</span>'}
          </td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-primary p-1" onclick="DokumenModule.openPreview(${d.id})" title="Pratinjau Dokumen"><i class="bi bi-eye"></i></button>
              <button class="btn btn-sm btn-outline-danger p-1" onclick="DokumenModule.deleteDokumen(${d.id})" title="Hapus"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-dokumen');
    if (!form) return;
    form.reset();
    document.getElementById('modal-dokumen-title').textContent = 'Upload Dokumen Digital Baru';
    this.renderGuruSelect();

    const modal = new bootstrap.Modal(document.getElementById('modal-dokumen-form'));
    modal.show();
  },

  openPreview(id) {
    const d = DB.getById('dokumen', id);
    if (!d) return;

    const guru = DB.getById('guru', d.guru_id) || {};
    const body = document.getElementById('modal-dokumen-preview-body');
    const title = document.getElementById('modal-dokumen-preview-title');

    if (title) title.innerHTML = `<i class="bi bi-file-earmark-text text-primary me-2"></i>${d.nama_dokumen}`;

    if (body) {
      body.innerHTML = `
        <div class="card p-4 border bg-light mb-3 text-start">
          <div class="row">
            <div class="col-md-6 mb-2">
              <small class="text-muted d-block">Pemilik Dokumen</small>
              <strong>${Helpers.formatNamaGelar(guru)}</strong>
            </div>
            <div class="col-md-6 mb-2">
              <small class="text-muted d-block">Kategori Berkas</small>
              <span class="badge bg-primary">${d.kategori_dokumen}</span>
            </div>
            <div class="col-md-6 mb-2">
              <small class="text-muted d-block">Nomor Dokumen</small>
              <strong>${d.nomor_dokumen || '-'}</strong>
            </div>
            <div class="col-md-6 mb-2">
              <small class="text-muted d-block">Tanggal Terbit / Masa Berlaku</small>
              <span>${Helpers.formatDateIndo(d.tanggal_terbit)} / ${d.tanggal_kadaluarsa ? Helpers.formatDateIndo(d.tanggal_kadaluarsa) : 'Seumur Hidup'}</span>
            </div>
          </div>
        </div>

        <div class="p-5 border rounded bg-white shadow-sm my-3">
          <i class="bi bi-file-earmark-pdf text-danger" style="font-size: 72px;"></i>
          <h5 class="mt-3 fw-bold">${d.file_name || d.nama_dokumen + '.pdf'}</h5>
          <p class="text-muted small">Ukuran file: ${d.file_size || '1.4 MB'} • Format: Digital PDF Archive Terverifikasi</p>
          <div class="mt-3 d-flex gap-2 justify-content-center">
            <button class="btn btn-primary btn-sm" onclick="App.showToast('Unduhan Dimulai', 'Mengunduh berkas digital: ${d.file_name || d.nama_dokumen}...', 'info')"><i class="bi bi-download me-1"></i>Unduh Berkas</button>
            <button class="btn btn-outline-secondary btn-sm" onclick="window.print()"><i class="bi bi-printer me-1"></i>Cetak Berkas</button>
          </div>
        </div>
      `;
    }

    const modal = new bootstrap.Modal(document.getElementById('modal-dokumen-preview'));
    modal.show();
  },

  saveDokumen() {
    const guruId = parseInt(document.getElementById('form-dokumen-guru-id').value);
    const namaDokumen = document.getElementById('form-dokumen-nama').value.trim();

    if (!guruId || !namaDokumen) {
      App.showToast('Peringatan', 'Pilih guru dan masukkan nama dokumen!', 'warning');
      return;
    }

    const data = {
      guru_id: guruId,
      kategori_dokumen: document.getElementById('form-dokumen-kategori').value,
      nama_dokumen: namaDokumen,
      nomor_dokumen: document.getElementById('form-dokumen-nomor').value.trim(),
      tanggal_terbit: document.getElementById('form-dokumen-tgl-terbit').value || new Date().toISOString().slice(0, 10),
      tanggal_kadaluarsa: document.getElementById('form-dokumen-tgl-exp').value || null,
      file_name: `${namaDokumen.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`,
      file_size: '1.2 MB',
      tanggal_unggah: new Date().toISOString().slice(0, 10)
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';

    DB.insert('dokumen', data, `Unggah dokumen digital (${data.nama_dokumen}) untuk ${namaGuru}`);
    App.showToast('Sukses', 'Dokumen digital berhasil diunggah dan diarsipkan.', 'success');

    const modalEl = document.getElementById('modal-dokumen-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderList();
  },

  deleteDokumen(id) {
    App.showConfirm('Hapus Dokumen', 'Hapus dokumen digital ini dari arsip?', () => {
      DB.delete('dokumen', id, 'Menghapus dokumen digital');
      this.renderList();
      App.showToast('Dihapus', 'Dokumen digital telah dihapus.', 'info');
    });
  },

  exportExcel() {
    const list = DB.getAll('dokumen');
    const data = list.map((d, idx) => {
      const g = DB.getById('guru', d.guru_id) || {};
      return {
        'No': idx + 1,
        'Pemilik Berkas': Helpers.formatNamaGelar(g),
        'Kategori Berkas': d.kategori_dokumen,
        'Nama Dokumen': d.nama_dokumen,
        'Nomor Dokumen': d.nomor_dokumen || '-',
        'Tanggal Terbit': d.tanggal_terbit || '-',
        'Masa Berlaku': d.tanggal_kadaluarsa || 'Seumur Hidup',
        'Nama File': d.file_name || '-'
      };
    });
    ExportUtils.exportToExcel(data, 'Rekap_Arsip_Dokumen_Guru_SDN_Sumber_Waru_2', 'Arsip Dokumen');
    App.showToast('Ekspor Berhasil', 'Data arsip dokumen telah diekspor ke Excel.', 'success');
  }
};
