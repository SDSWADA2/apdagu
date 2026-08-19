/**
 * ============================================================================
 * MODUL DATA GURU (MASTER GURU & CRUD LENGKAP)
 * Lengkap dengan Export Excel & Import Excel/CSV Cerdas
 * ============================================================================
 */

const GuruModule = {
  currentPage: 1,
  pageSize: 10,
  searchTerm: '',
  filterStatus: 'all',
  filterGender: 'all',
  sortBy: 'nama_asc',
  signatureCanvas: null,
  signaturePadActive: false,
  importedDataCache: [],

  init() {
    this.bindEvents();
    this.renderTable();
    this.initSignaturePad();
    this.bindImportEvents();
  },

  bindEvents() {
    // Live Search
    const searchInput = document.getElementById('search-guru-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.currentPage = 1;
        this.renderTable();
      });
    }

    // Filters
    const statusFilter = document.getElementById('filter-guru-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.currentPage = 1;
        this.renderTable();
      });
    }

    const genderFilter = document.getElementById('filter-guru-gender');
    if (genderFilter) {
      genderFilter.addEventListener('change', (e) => {
        this.filterGender = e.target.value;
        this.currentPage = 1;
        this.renderTable();
      });
    }

    const sortSelect = document.getElementById('sort-guru-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderTable();
      });
    }

    // Form Submit (Tambah/Edit)
    const guruForm = document.getElementById('form-guru');
    if (guruForm) {
      guruForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveGuru();
      });
    }
  },

  bindImportEvents() {
    const importInput = document.getElementById('input-file-import-guru');
    if (importInput) {
      importInput.addEventListener('change', (e) => this.handleImportFileChange(e));
    }
  },

  initSignaturePad() {
    const canvas = document.getElementById('canvas-signature-pad');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    // Resize canvas display width
    canvas.width = canvas.parentElement.clientWidth || 400;
    canvas.height = 140;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDraw = (e) => {
      isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (e.type === 'touchstart') e.preventDefault();
    };

    const draw = (e) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      if (e.type === 'touchmove') e.preventDefault();
    };

    const stopDraw = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    // Clear Button
    const clearBtn = document.getElementById('btn-clear-signature');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    }

    this.signatureCanvas = canvas;
  },

  getFilteredGuru() {
    let list = DB.getAll('guru');
    const kepList = DB.getAll('kepegawaian');

    // Filter Search
    if (this.searchTerm) {
      list = list.filter(g => 
        (g.nama_lengkap && g.nama_lengkap.toLowerCase().includes(this.searchTerm)) ||
        (g.nuptk && g.nuptk.includes(this.searchTerm)) ||
        (g.nip && g.nip.includes(this.searchTerm)) ||
        (g.email && g.email.toLowerCase().includes(this.searchTerm)) ||
        (g.nik && g.nik.includes(this.searchTerm))
      );
    }

    // Filter Status Kepegawaian
    if (this.filterStatus !== 'all') {
      list = list.filter(g => {
        const kep = kepList.find(k => k.guru_id === g.id);
        return kep && kep.status_kepegawaian === this.filterStatus;
      });
    }

    // Filter Gender
    if (this.filterGender !== 'all') {
      list = list.filter(g => g.jenis_kelamin === this.filterGender);
    }

    // Sorting
    list.sort((a, b) => {
      if (this.sortBy === 'nama_asc') return a.nama_lengkap.localeCompare(b.nama_lengkap);
      if (this.sortBy === 'nama_desc') return b.nama_lengkap.localeCompare(a.nama_lengkap);
      if (this.sortBy === 'usia_asc') return new Date(b.tanggal_lahir) - new Date(a.tanggal_lahir);
      if (this.sortBy === 'usia_desc') return new Date(a.tanggal_lahir) - new Date(b.tanggal_lahir);
      return 0;
    });

    return list;
  },

  renderTable() {
    const tableBody = document.getElementById('guru-table-body');
    const paginationEl = document.getElementById('guru-pagination');
    const badgeSidebar = document.getElementById('sidebar-badge-guru');
    if (!tableBody) return;

    const filtered = this.getFilteredGuru();
    const allGuru = DB.getAll('guru');
    if (badgeSidebar) badgeSidebar.textContent = allGuru.length;

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
    this.currentPage = Math.min(this.currentPage, totalPages);

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pagedItems = filtered.slice(startIndex, startIndex + this.pageSize);

    const kepList = DB.getAll('kepegawaian');
    const sertifikasiList = DB.getAll('sertifikasi');

    if (pagedItems.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-4 d-block mb-2"></i> Tidak ada data guru yang cocok dengan pencarian.</td></tr>`;
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    tableBody.innerHTML = pagedItems.map((g, idx) => {
      const kep = kepList.find(k => k.guru_id === g.id);
      const isCertified = sertifikasiList.some(s => s.guru_id === g.id && s.status_berlaku === 'Aktif');
      const age = Helpers.calculateAge(g.tanggal_lahir);

      const statusBadges = {
        'PNS': '<span class="badge-custom badge-pns">PNS</span>',
        'PPPK': '<span class="badge-custom badge-pppk">PPPK</span>',
        'Honorer Sekolah (BOS)': '<span class="badge-custom badge-honorer">Honorer BOS</span>',
        'Honorer Daerah': '<span class="badge-custom badge-honorer">Honorer Daerah</span>'
      };

      const statusBadge = kep ? (statusBadges[kep.status_kepegawaian] || `<span class="badge bg-secondary">${kep.status_kepegawaian}</span>`) : '-';

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${startIndex + idx + 1}</td>
          <td>
            <div class="d-flex align-items-center gap-3">
              <img src="${g.foto_url || generateAvatar(g.nama_lengkap)}" class="avatar-teacher" alt="${g.nama_lengkap}">
              <div>
                <a href="javascript:void(0)" onclick="GuruModule.viewDetail(${g.id})" class="fw-bold text-decoration-none text-dark d-block">
                  ${Helpers.formatNamaGelar(g)}
                </a>
                <small class="text-muted"><i class="bi bi-person-badge me-1"></i>NUPTK: ${g.nuptk || '-'}</small>
              </div>
            </div>
          </td>
          <td>
            <div class="fw-semibold">${g.nip && g.nip !== '-' ? g.nip : '<span class="text-muted">Non-NIP</span>'}</div>
            <small class="text-muted"><i class="bi bi-geo-alt me-1"></i>${g.tempat_lahir}, ${Helpers.formatDateIndo(g.tanggal_lahir)} (${age} th)</small>
          </td>
          <td>
            <div class="fw-semibold">${kep ? kep.jabatan : '-'}</div>
            <small class="text-muted">${kep ? kep.pangkat_golongan : '-'}</small>
          </td>
          <td>
            ${statusBadge}
          </td>
          <td>
            ${isCertified 
              ? '<span class="badge-custom badge-sertifikasi"><i class="bi bi-patch-check-fill me-1"></i>Bersertifikat</span>' 
              : '<span class="badge bg-light text-muted border">Belum Sertifikasi</span>'}
          </td>
          <td class="text-center">
            <div class="dropdown">
              <button class="btn btn-sm btn-light border dropdown-toggle" type="button" data-bs-toggle="dropdown">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li><a class="dropdown-item" href="javascript:void(0)" onclick="GuruModule.viewDetail(${g.id})"><i class="bi bi-eye text-info me-2"></i>Lihat Profil Lengkap</a></li>
                <li><a class="dropdown-item" href="javascript:void(0)" onclick="LaporanModule.previewIDCard(${g.id})"><i class="bi bi-card-heading text-primary me-2"></i>Cetak ID Card</a></li>
                <li><a class="dropdown-item" href="javascript:void(0)" onclick="LaporanModule.printBiodataA4(${g.id})"><i class="bi bi-printer text-success me-2"></i>Cetak Biodata A4</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="javascript:void(0)" onclick="GuruModule.openEditModal(${g.id})"><i class="bi bi-pencil-square text-warning me-2"></i>Edit Data</a></li>
                <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="GuruModule.deleteGuru(${g.id})"><i class="bi bi-trash me-2"></i>Hapus Guru</a></li>
              </ul>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Render Pagination
    if (paginationEl) {
      let pageHtml = `
        <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link" href="javascript:void(0)" onclick="GuruModule.setPage(${this.currentPage - 1})">&laquo;</a>
        </li>
      `;
      for (let p = 1; p <= totalPages; p++) {
        pageHtml += `
          <li class="page-item ${this.currentPage === p ? 'active' : ''}">
            <a class="page-link" href="javascript:void(0)" onclick="GuruModule.setPage(${p})">${p}</a>
          </li>
        `;
      }
      pageHtml += `
        <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="javascript:void(0)" onclick="GuruModule.setPage(${this.currentPage + 1})">&raquo;</a>
        </li>
      `;
      paginationEl.innerHTML = pageHtml;
    }
  },

  setPage(page) {
    this.currentPage = page;
    this.renderTable();
  },

  openAddModal() {
    const form = document.getElementById('form-guru');
    if (!form) return;
    form.reset();
    document.getElementById('form-guru-id').value = '';
    document.getElementById('modal-guru-title').textContent = 'Tambah Data Guru Baru';

    // Clear signature canvas
    if (this.signatureCanvas) {
      const ctx = this.signatureCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
    }

    const modal = new bootstrap.Modal(document.getElementById('modal-guru-form'));
    modal.show();
  },

  openEditModal(guruId) {
    const guru = DB.getById('guru', guruId);
    if (!guru) return;

    document.getElementById('modal-guru-title').textContent = 'Edit Data Guru';
    document.getElementById('form-guru-id').value = guru.id;
    document.getElementById('form-guru-nama').value = guru.nama_lengkap || '';
    document.getElementById('form-guru-gelar-depan').value = guru.gelar_depan || '';
    document.getElementById('form-guru-gelar-belakang').value = guru.gelar_belakang || '';
    document.getElementById('form-guru-nuptk').value = guru.nuptk || '';
    document.getElementById('form-guru-nip').value = guru.nip || '';
    document.getElementById('form-guru-gender').value = guru.jenis_kelamin || 'Laki-laki';
    document.getElementById('form-guru-tempat-lahir').value = guru.tempat_lahir || '';
    document.getElementById('form-guru-tanggal-lahir').value = guru.tanggal_lahir || '';
    document.getElementById('form-guru-agama').value = guru.agama || 'Islam';
    document.getElementById('form-guru-status-nikah').value = guru.status_pernikahan || 'Menikah';
    document.getElementById('form-guru-nik').value = guru.nik || '';
    document.getElementById('form-guru-no-kk').value = guru.no_kk || '';
    document.getElementById('form-guru-npwp').value = guru.npwp || '';
    document.getElementById('form-guru-hp').value = guru.no_hp || '';
    document.getElementById('form-guru-email').value = guru.email || '';
    document.getElementById('form-guru-alamat').value = guru.alamat_jalan || '';
    document.getElementById('form-guru-rt-rw').value = guru.rt_rw || '';
    document.getElementById('form-guru-desa').value = guru.desa_kelurahan || '';
    document.getElementById('form-guru-kecamatan').value = guru.kecamatan || '';
    document.getElementById('form-guru-kabupaten').value = guru.kabupaten_kota || '';
    document.getElementById('form-guru-provinsi').value = guru.provinsi || '';
    document.getElementById('form-guru-kode-pos').value = guru.kode_pos || '';
    document.getElementById('form-guru-status-aktif').value = guru.status_keaktifan || 'Aktif';

    // Kepegawaian
    const kep = DB.getAll('kepegawaian').find(k => k.guru_id === guru.id);
    document.getElementById('form-guru-status-pegawai').value = kep ? (kep.status_kepegawaian || 'PNS') : 'Honorer Sekolah (BOS)';
    document.getElementById('form-guru-jabatan').value = kep ? (kep.jabatan || '') : 'Guru Kelas';
    document.getElementById('form-guru-pangkat').value = kep ? (kep.pangkat_golongan || '') : '';
    document.getElementById('form-guru-tmt').value = kep ? (kep.tmt_pengangkatan || '') : '';
    document.getElementById('form-guru-no-sk').value = kep ? (kep.nomor_sk || '') : '';

    // Clear signature canvas
    const canvas = document.getElementById('canvas-signature-pad');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const modal = new bootstrap.Modal(document.getElementById('modal-guru-form'));
    modal.show();
  },

  saveGuru() {
    const guruId = document.getElementById('form-guru-id').value;
    const nama = document.getElementById('form-guru-nama').value.trim();

    if (!nama) {
      App.showToast('Peringatan', 'Nama lengkap guru wajib diisi!', 'warning');
      return;
    }

    let signatureData = null;
    if (this.signatureCanvas) {
      signatureData = this.signatureCanvas.toDataURL('image/png');
    }

    const guruData = {
      nama_lengkap: nama,
      gelar_depan: document.getElementById('form-guru-gelar-depan').value.trim(),
      gelar_belakang: document.getElementById('form-guru-gelar-belakang').value.trim(),
      nuptk: document.getElementById('form-guru-nuptk').value.trim(),
      nip: document.getElementById('form-guru-nip').value.trim(),
      jenis_kelamin: document.getElementById('form-guru-gender').value,
      tempat_lahir: document.getElementById('form-guru-tempat-lahir').value.trim(),
      tanggal_lahir: document.getElementById('form-guru-tanggal-lahir').value,
      agama: document.getElementById('form-guru-agama').value,
      status_pernikahan: document.getElementById('form-guru-status-nikah').value,
      nik: document.getElementById('form-guru-nik').value.trim(),
      no_kk: document.getElementById('form-guru-no-kk').value.trim(),
      npwp: document.getElementById('form-guru-npwp').value.trim(),
      no_hp: document.getElementById('form-guru-hp').value.trim(),
      email: document.getElementById('form-guru-email').value.trim(),
      alamat_jalan: document.getElementById('form-guru-alamat').value.trim(),
      rt_rw: document.getElementById('form-guru-rt-rw').value.trim(),
      desa_kelurahan: document.getElementById('form-guru-desa').value.trim(),
      kecamatan: document.getElementById('form-guru-kecamatan').value.trim(),
      kabupaten_kota: document.getElementById('form-guru-kabupaten').value.trim(),
      provinsi: document.getElementById('form-guru-provinsi').value.trim(),
      kode_pos: document.getElementById('form-guru-kode-pos').value.trim(),
      status_keaktifan: document.getElementById('form-guru-status-aktif').value
    };

    if (signatureData && signatureData.length > 500) {
      guruData.tanda_tangan_url = signatureData;
    }

    if (!guruId) {
      // Create new
      guruData.foto_url = generateAvatar(nama);
      const inserted = DB.insert('guru', guruData, `Menambahkan guru baru: ${Helpers.formatNamaGelar(guruData)}`);

      // Insert default kepegawaian
      DB.insert('kepegawaian', {
        guru_id: inserted.id,
        status_kepegawaian: document.getElementById('form-guru-status-pegawai').value,
        jabatan: document.getElementById('form-guru-jabatan').value.trim() || 'Guru Kelas',
        pangkat_golongan: document.getElementById('form-guru-pangkat').value.trim(),
        tmt_pengangkatan: document.getElementById('form-guru-tmt').value || '2026-01-01',
        nomor_sk: document.getElementById('form-guru-no-sk').value.trim(),
        instansi: 'Dinas Pendidikan',
        unit_kerja: 'SD Negeri Sumber Waru 2'
      });

      // Insert default beban mengajar 24 JP
      DB.insert('beban_mengajar', {
        guru_id: inserted.id,
        jp_tatap_muka: 24,
        tugas_tambahan: '-',
        jp_tugas_tambahan: 0,
        ekstrakurikuler: '-',
        jp_ekskul: 0,
        keterangan: 'Memenuhi Beban Kerja'
      });

      App.showToast('Sukses!', 'Data guru baru berhasil ditambahkan.', 'success');
    } else {
      // Update existing
      DB.update('guru', guruId, guruData, `Memperbarui data guru: ${Helpers.formatNamaGelar(guruData)}`);

      // Update kepegawaian
      const kep = DB.getAll('kepegawaian').find(k => k.guru_id == guruId);
      const kepData = {
        status_kepegawaian: document.getElementById('form-guru-status-pegawai').value,
        jabatan: document.getElementById('form-guru-jabatan').value.trim(),
        pangkat_golongan: document.getElementById('form-guru-pangkat').value.trim(),
        tmt_pengangkatan: document.getElementById('form-guru-tmt').value,
        nomor_sk: document.getElementById('form-guru-no-sk').value.trim()
      };
      if (kep) {
        DB.update('kepegawaian', kep.id, kepData);
      } else {
        DB.insert('kepegawaian', { guru_id: parseInt(guruId), ...kepData });
      }

      App.showToast('Sukses!', 'Data guru berhasil diperbarui.', 'success');
    }

    const modalEl = document.getElementById('modal-guru-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderTable();
    DashboardModule.init();
  },

  deleteGuru(guruId) {
    const guru = DB.getById('guru', guruId);
    if (!guru) return;

    App.showConfirm('Hapus Guru', `Apakah Anda yakin ingin menghapus data guru "${Helpers.formatNamaGelar(guru)}"? Semua data relasi (Pendidikan, Sertifikasi, Jadwal, Absensi, PKG, Dokumen) akan ikut terhapus.`, () => {
      DB.delete('guru', guruId, `Menghapus data guru: ${Helpers.formatNamaGelar(guru)}`);
      App.showToast('Dihapus!', 'Data guru dan berkas terkait telah dihapus.', 'info');
      this.renderTable();
      DashboardModule.init();
    });
  },

  viewDetail(guruId) {
    const guru = DB.getById('guru', guruId);
    if (!guru) return;

    const kep = DB.getAll('kepegawaian').find(k => k.guru_id === guru.id) || {};
    const pendList = DB.getAll('pendidikan').filter(p => p.guru_id === guru.id);
    const sertList = DB.getAll('sertifikasi').filter(s => s.guru_id === guru.id);
    const jadwalList = DB.getAll('jadwal_mengajar').filter(j => j.guru_id === guru.id);
    const beban = DB.getAll('beban_mengajar').find(b => b.guru_id === guru.id) || {};
    const pkgList = DB.getAll('pkg').filter(p => p.guru_id === guru.id);
    const presList = DB.getAll('prestasi').filter(p => p.guru_id === guru.id);
    const docList = DB.getAll('dokumen').filter(d => d.guru_id === guru.id);

    const masaKerja = Helpers.calculateMasaKerja(kep.tmt_pengangkatan);
    const age = Helpers.calculateAge(guru.tanggal_lahir);

    // Populate Detail Modal Body
    const contentEl = document.getElementById('modal-detail-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="row">
        <!-- Kolom Kiri: Profil & QR & TTD -->
        <div class="col-lg-4 text-center border-end pe-lg-4">
          <img src="${guru.foto_url || generateAvatar(guru.nama_lengkap)}" class="avatar-teacher-lg mb-3" alt="${guru.nama_lengkap}">
          <h5 class="fw-bold mb-1">${Helpers.formatNamaGelar(guru)}</h5>
          <p class="text-primary fw-bold mb-1">${kep.jabatan || 'Guru SD'}</p>
          <span class="badge bg-secondary mb-3">${kep.status_kepegawaian || '-'} (${kep.pangkat_golongan || '-'})</span>
          
          <div class="card bg-light border p-3 text-start mb-3">
            <small class="text-muted d-block">NUPTK: <strong>${guru.nuptk || '-'}</strong></small>
            <small class="text-muted d-block">NIP: <strong>${guru.nip || '-'}</strong></small>
            <small class="text-muted d-block">Masa Kerja: <strong>${masaKerja.text}</strong></small>
            <small class="text-muted d-block">Usia: <strong>${age} Tahun</strong></small>
            <small class="text-muted d-block">Status: <span class="badge bg-success">${guru.status_keaktifan || 'Aktif'}</span></small>
          </div>

          <div class="card p-2 border mb-3 text-center">
            <small class="fw-bold mb-1 text-muted">QR Code Verifikasi</small>
            <div id="detail-qr-container" class="d-flex justify-content-center py-2"></div>
            <small class="text-muted" style="font-size:10px;">Validasi ID: SDN2-GURU-${guru.id}</small>
          </div>

          <div class="card p-2 border text-center">
            <small class="fw-bold mb-1 text-muted">Tanda Tangan Digital</small>
            <div class="py-2">
              <img src="${guru.tanda_tangan_url || DEFAULT_SIGNATURE}" style="max-height: 55px; max-width: 140px;" alt="TTD Guru">
            </div>
          </div>
        </div>

        <!-- Kolom Kanan: Detail Tabs -->
        <div class="col-lg-8 ps-lg-4">
          <ul class="nav nav-tabs nav-fill mb-3" id="detailTab" role="tablist">
            <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-identitas">Identitas</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-pendidikan">Pendidikan (${pendList.length})</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-sertifikasi">Sertifikasi (${sertList.length})</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-kinerja">Kinerja & Dokumen</button></li>
          </ul>

          <div class="tab-content" id="detailTabContent">
            <!-- Tab Identitas -->
            <div class="tab-pane fade show active" id="tab-identitas">
              <h6 class="fw-bold border-bottom pb-2 mb-3"><i class="bi bi-person-lines-fill text-primary me-2"></i>Biodata Lengkap</h6>
              <table class="table table-sm table-borderless">
                <tr><td class="text-muted" width="35%">Tempat, Tgl Lahir</td><td>: <strong>${guru.tempat_lahir}, ${Helpers.formatDateIndo(guru.tanggal_lahir)}</strong></td></tr>
                <tr><td class="text-muted">Jenis Kelamin</td><td>: ${guru.jenis_kelamin}</td></tr>
                <tr><td class="text-muted">Agama</td><td>: ${guru.agama}</td></tr>
                <tr><td class="text-muted">Status Pernikahan</td><td>: ${guru.status_pernikahan}</td></tr>
                <tr><td class="text-muted">NIK KTP</td><td>: ${guru.nik || '-'}</td></tr>
                <tr><td class="text-muted">No. Kartu Keluarga</td><td>: ${guru.no_kk || '-'}</td></tr>
                <tr><td class="text-muted">NPWP</td><td>: ${guru.npwp || '-'}</td></tr>
                <tr><td class="text-muted">No. HP / WhatsApp</td><td>: <strong>${guru.no_hp || '-'}</strong></td></tr>
                <tr><td class="text-muted">Email</td><td>: ${guru.email || '-'}</td></tr>
                <tr><td class="text-muted">Alamat Lengkap</td><td>: ${guru.alamat_jalan}, RT ${guru.rt_rw}, Ds. ${guru.desa_kelurahan}, Kec. ${guru.kecamatan}, Kab. ${guru.kabupaten_kota}, Prov. ${guru.provinsi} (${guru.kode_pos})</td></tr>
              </table>

              <h6 class="fw-bold border-bottom pb-2 mb-3 mt-4"><i class="bi bi-briefcase text-primary me-2"></i>Kepegawaian</h6>
              <table class="table table-sm table-borderless">
                <tr><td class="text-muted" width="35%">Status Kepegawaian</td><td>: <span class="badge bg-primary">${kep.status_kepegawaian || '-'}</span></td></tr>
                <tr><td class="text-muted">Pangkat / Golongan</td><td>: ${kep.pangkat_golongan || '-'}</td></tr>
                <tr><td class="text-muted">TMT Pengangkatan</td><td>: ${Helpers.formatDateIndo(kep.tmt_pengangkatan)}</td></tr>
                <tr><td class="text-muted">No. SK Pengangkatan</td><td>: ${kep.nomor_sk || '-'}</td></tr>
                <tr><td class="text-muted">Unit Kerja</td><td>: SD Negeri Sumber Waru 2</td></tr>
              </table>
            </div>

            <!-- Tab Pendidikan -->
            <div class="tab-pane fade" id="tab-pendidikan">
              <h6 class="fw-bold border-bottom pb-2 mb-3">Riwayat Pendidikan Formal</h6>
              ${pendList.length === 0 ? '<p class="text-muted">Belum ada riwayat pendidikan.</p>' : `
                <div class="timeline">
                  ${pendList.map(p => `
                    <div class="p-3 mb-2 rounded bg-light border">
                      <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-primary">${p.jenjang}</span>
                        <small class="text-muted">${p.tahun_masuk} - ${p.tahun_lulus}</small>
                      </div>
                      <h6 class="fw-bold mb-1 mt-2">${p.nama_institusi}</h6>
                      <p class="mb-1 text-muted">${p.program_studi} (IPK: <strong>${p.ipk || '-'}</strong>)</p>
                      <small class="text-muted">No. Ijazah: ${p.nomor_ijazah || '-'}</small>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- Tab Sertifikasi -->
            <div class="tab-pane fade" id="tab-sertifikasi">
              <h6 class="fw-bold border-bottom pb-2 mb-3">Sertifikasi Pendidik (PPG)</h6>
              ${sertList.length === 0 ? '<p class="text-muted">Belum memiliki sertifikasi pendidik.</p>' : `
                ${sertList.map(s => `
                  <div class="p-3 mb-2 rounded bg-light border">
                    <div class="d-flex justify-content-between align-items-center">
                      <h6 class="fw-bold mb-0 text-primary">${s.bidang_studi}</h6>
                      <span class="badge bg-success">${s.status_berlaku}</span>
                    </div>
                    <hr class="my-2">
                    <small class="d-block text-muted">No. Sertifikat: <strong>${s.nomor_sertifikat}</strong></small>
                    <small class="d-block text-muted">NRG: <strong>${s.nomor_registrasi_guru || '-'}</strong></small>
                    <small class="d-block text-muted">LPTK Penyelenggara: ${s.lptk_penyelenggara} (Tahun ${s.tahun_sertifikasi})</small>
                  </div>
                `).join('')}
              `}
            </div>

            <!-- Tab Kinerja & Dokumen -->
            <div class="tab-pane fade" id="tab-kinerja">
              <h6 class="fw-bold border-bottom pb-2 mb-3">Beban Mengajar & PKG Terakhir</h6>
              <div class="p-3 mb-3 rounded bg-light border">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="fw-bold">Beban Kerja Mingguan:</span>
                  ${Helpers.validate24JP((beban.jp_tatap_muka || 0) + (beban.jp_tugas_tambahan || 0) + (beban.jp_ekskul || 0)).badge === 'bg-success' 
                    ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>24 JP Terpenuhi</span>' 
                    : '<span class="badge bg-danger">Kurang dari 24 JP</span>'}
                </div>
                <small class="d-block text-muted">Tatap Muka: <strong>${beban.jp_tatap_muka || 0} JP</strong> | Tugas Tambahan: <strong>${beban.jp_tugas_tambahan || 0} JP</strong> (${beban.tugas_tambahan || '-'})</small>
              </div>

              <h6 class="fw-bold border-bottom pb-2 mb-3">Dokumen Tersimpan (${docList.length})</h6>
              ${docList.length === 0 ? '<p class="text-muted">Belum ada dokumen yang diunggah.</p>' : `
                <div class="list-group">
                  ${docList.map(d => `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <span class="badge bg-info text-dark me-2">${d.kategori_dokumen}</span>
                        <strong>${d.nama_dokumen}</strong>
                      </div>
                      <span class="badge bg-light text-muted border">${d.ukuran_file_kb || 250} KB</span>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    // Render QR Code in modal
    setTimeout(() => {
      ExportUtils.renderQRCode('detail-qr-container', `SDN2-GURU-${guru.id}-${guru.nuptk || guru.nip || 'SW2'}`, 90);
    }, 150);

    const modal = new bootstrap.Modal(document.getElementById('modal-guru-detail'));
    modal.show();
  },

  // ==========================================================================
  // FITUR IMPORT EXCEL / CSV LENGKAP
  // ==========================================================================
  openImportModal() {
    const fileInput = document.getElementById('input-file-import-guru');
    if (fileInput) fileInput.value = '';
    
    const previewContainer = document.getElementById('import-guru-preview-container');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-file-earmark-spreadsheet fs-1 text-primary d-block mb-2"></i>
          Pilih file Excel (.xlsx / .xls) atau CSV untuk melihat pratinjau data sebelum diimport.
        </div>
      `;
    }

    const btnExecute = document.getElementById('btn-execute-import-guru');
    if (btnExecute) btnExecute.disabled = true;

    this.importedDataCache = [];

    const modal = new bootstrap.Modal(document.getElementById('modal-import-guru'));
    modal.show();
  },

  downloadTemplate() {
    ExportUtils.downloadGuruTemplateExcel();
    App.showToast('Template Siap', 'Template Excel import data guru berhasil diunduh.', 'success');
  },

  async handleImportFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const previewContainer = document.getElementById('import-guru-preview-container');
    const btnExecute = document.getElementById('btn-execute-import-guru');

    try {
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="small text-muted mt-2">Membaca dan memvalidasi file spreadsheet...</p>
          </div>
        `;
      }

      const rows = await ExportUtils.readExcelFile(file);
      if (!rows || rows.length === 0) {
        if (previewContainer) {
          previewContainer.innerHTML = `<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-1"></i> File Excel kosong atau tidak memiliki baris data.</div>`;
        }
        return;
      }

      // Helper: Normalisasi Tanggal (menangani objek Date dari SheetJS maupun string)
      const normalizeDate = (val) => {
        if (!val) return '';
        if (val instanceof Date) {
          const y = val.getFullYear();
          const m = String(val.getMonth() + 1).padStart(2, '0');
          const d = String(val.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        const str = String(val).trim();
        // Coba parse berbagai format tanggal Indonesia: DD/MM/YYYY atau YYYY-MM-DD
        const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (ddmmyyyy) {
          return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
        }
        // Jika sudah format YYYY-MM-DD ambil langsung
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
        return str;
      };

      // Normalize field mapping (fleksibel terhadap variasi nama kolom, termasuk judul panjang)
      this.importedDataCache = rows.map((row, idx) => {
        // Helper cari nilai berdasarkan array kandidat header
        const findVal = (keys) => {
          for (const k of keys) {
            const foundKey = Object.keys(row).find(rk => 
              rk.trim().toLowerCase() === k.toLowerCase() || 
              rk.trim().toLowerCase().startsWith(k.toLowerCase())
            );
            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
              return String(row[foundKey]).trim();
            }
          }
          return '';
        };

        const nama = findVal(['Nama Lengkap', 'Nama', 'Nama Guru', 'NAMA']);
        const nuptk = findVal(['NUPTK', 'nuptk']);
        const nip = findVal(['NIP', 'nip']) || '-';
        const gelarDepan = findVal(['Gelar Depan', 'Gelar_Depan']);
        const gelarBelakang = findVal(['Gelar Belakang', 'Gelar_Belakang']);
        const genderRaw = findVal(['Jenis Kelamin', 'Gender', 'JK']);
        const gender = (genderRaw.toLowerCase() === 'p' || genderRaw.toLowerCase().startsWith('perempuan')) ? 'Perempuan' : 'Laki-laki';
        const tempatLahir = findVal(['Tempat Lahir', 'Tempat_Lahir']) || 'Pamekasan';
        const tglLahirRaw = row[Object.keys(row).find(k => k.toLowerCase().startsWith('tanggal lahir')) || ''];
        const tglLahir = normalizeDate(tglLahirRaw) || '1990-01-01';
        const agama = findVal(['Agama', 'agama']) || 'Islam';
        const statusNikah = findVal(['Status Pernikahan', 'Status Nikah']) || 'Menikah';
        const nik = findVal(['NIK', 'nik', 'No KTP']);
        const noKk = findVal(['No KK', 'KK', 'No. KK']);
        const npwp = findVal(['NPWP', 'npwp']) || '-';
        const noHp = findVal(['No HP', 'No HP / WhatsApp', 'HP', 'Telepon', 'WA']) || '081234567890';
        const email = findVal(['Email', 'email', 'Surel']) || '';
        const alamat = findVal(['Alamat', 'Alamat Jalan', 'Alamat Lengkap']) || 'Desa Sumber Waru';
        const rtRw = findVal(['RT/RW', 'RT_RW', 'RT / RW']) || '001/001';
        const desa = findVal(['Desa', 'Kelurahan', 'Desa/Kelurahan']) || 'Sumber Waru';
        const kecamatan = findVal(['Kecamatan', 'Kec']) || 'Waru';
        const kabupaten = findVal(['Kabupaten', 'Kabupaten/Kota', 'Kab']) || 'Kabupaten Pamekasan';
        const provinsi = findVal(['Provinsi', 'Prov']) || 'Jawa Timur';
        const kodePos = findVal(['Kode Pos', 'Kodepos']) || '67291';
        // Status Kepegawaian: cari dengan startsWith karena header-nya panjang + kurung
        const statusPegawai = findVal(['Status Kepegawaian', 'Status Pegawai', 'Status']) || 'Honorer Sekolah (BOS)';
        const jabatan = findVal(['Jabatan', 'Tugas']) || 'Guru Kelas';
        const pangkat = findVal(['Pangkat Golongan', 'Pangkat', 'Golongan']) || '-';
        const tmtRaw = row[Object.keys(row).find(k => k.toLowerCase().startsWith('tmt pengangkatan') || k.toLowerCase() === 'tmt') || ''];
        const tmt = normalizeDate(tmtRaw) || '2024-01-01';
        const nomorSk = findVal(['Nomor SK', 'No SK']) || '-';

        return {
          valid: nama.length > 0,
          nama_lengkap: nama || `Guru Baris ${idx + 1}`,
          gelar_depan: gelarDepan,
          gelar_belakang: gelarBelakang,
          nuptk: nuptk,
          nip: nip,
          jenis_kelamin: gender,
          tempat_lahir: tempatLahir,
          tanggal_lahir: tglLahir,
          agama: agama,
          status_pernikahan: statusNikah,
          nik: nik,
          no_kk: noKk,
          npwp: npwp,
          no_hp: noHp,
          email: email,
          alamat_jalan: alamat,
          rt_rw: rtRw,
          desa_kelurahan: desa,
          kecamatan: kecamatan,
          kabupaten_kota: kabupaten,
          provinsi: provinsi,
          kode_pos: kodePos,
          status_keaktifan: 'Aktif',
          status_kepegawaian: statusPegawai,
          jabatan: jabatan,
          pangkat_golongan: pangkat,
          tmt_pengangkatan: tmt,
          nomor_sk: nomorSk
        };
      });

      // Render Preview Table
      const validCount = this.importedDataCache.filter(r => r.valid).length;
      const invalidCount = this.importedDataCache.length - validCount;
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <span class="badge bg-success me-1"><i class="bi bi-check-circle me-1"></i>${validCount} baris valid siap import</span>
              ${invalidCount > 0 ? `<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>${invalidCount} baris kosong/tidak valid (akan dilewati)</span>` : ''}
            </div>
            <small class="text-muted">Pratinjau 5 baris pertama:</small>
          </div>
          <div class="table-responsive border rounded" style="max-height: 250px;">
            <table class="table table-sm table-striped mb-0" style="font-size: 0.78rem;">
              <thead class="table-light">
                <tr>
                  <th>No</th>
                  <th>Nama Lengkap</th>
                  <th>NUPTK</th>
                  <th>NIP</th>
                  <th>Tgl Lahir</th>
                  <th>Status Pegawai</th>
                  <th>Jabatan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${this.importedDataCache.slice(0, 5).map((r, i) => `
                  <tr class="${!r.valid ? 'table-warning' : ''}">
                    <td>${i + 1}</td>
                    <td><strong>${r.gelar_depan ? r.gelar_depan + ' ' : ''}${r.nama_lengkap}${r.gelar_belakang ? ', ' + r.gelar_belakang : ''}</strong></td>
                    <td><code>${r.nuptk || '-'}</code></td>
                    <td>${r.nip || '-'}</td>
                    <td>${r.tanggal_lahir || '-'}</td>
                    <td><span class="badge bg-primary">${r.status_kepegawaian}</span></td>
                    <td>${r.jabatan}</td>
                    <td>${r.valid ? '<span class="text-success">✓</span>' : '<span class="text-danger">✗ Nama Kosong</span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      if (btnExecute) btnExecute.disabled = validCount === 0;
    } catch (err) {
      console.error('Gagal memproses file import:', err);
      if (previewContainer) {
        previewContainer.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle me-1"></i> Gagal membaca file spreadsheet: <strong>${err.message}</strong>. Pastikan file adalah format .xlsx atau .csv yang valid.</div>`;
      }
      if (btnExecute) btnExecute.disabled = true;
    }
  },

  executeImportGuru() {
    if (!this.importedDataCache || this.importedDataCache.length === 0) {
      App.showToast('Import Dibatalkan', 'Tidak ada data yang dapat diimport. Silakan pilih file terlebih dahulu.', 'warning');
      return;
    }

    const validRows = this.importedDataCache.filter(r => r.valid);
    if (validRows.length === 0) {
      App.showToast('Data Tidak Valid', 'Tidak ada baris data yang valid (pastikan kolom Nama Lengkap terisi).', 'warning');
      return;
    }

    let insertedCount = 0;
    let updatedCount = 0;

    validRows.forEach(row => {
      // Cek apakah guru sudah ada berdasarkan NUPTK atau NIP atau NIK
      const existingGuru = DB.getAll('guru').find(g => 
        (row.nuptk && g.nuptk === row.nuptk) || 
        (row.nip && row.nip !== '-' && g.nip === row.nip) ||
        (row.nik && g.nik === row.nik)
      );

      const guruData = {
        nama_lengkap: row.nama_lengkap,
        gelar_depan: row.gelar_depan,
        gelar_belakang: row.gelar_belakang,
        nuptk: row.nuptk,
        nip: row.nip,
        jenis_kelamin: row.jenis_kelamin,
        tempat_lahir: row.tempat_lahir,
        tanggal_lahir: row.tanggal_lahir,
        agama: row.agama,
        status_pernikahan: row.status_pernikahan,
        nik: row.nik,
        no_kk: row.no_kk,
        npwp: row.npwp,
        no_hp: row.no_hp,
        email: row.email,
        alamat_jalan: row.alamat_jalan,
        rt_rw: row.rt_rw,
        desa_kelurahan: row.desa_kelurahan,
        kecamatan: row.kecamatan,
        kabupaten_kota: row.kabupaten_kota,
        provinsi: row.provinsi,
        kode_pos: row.kode_pos,
        status_keaktifan: row.status_keaktifan,
        tanda_tangan_url: (typeof DEFAULT_SIGNATURE !== 'undefined') ? DEFAULT_SIGNATURE : ''
      };

      if (existingGuru) {
        // Update
        DB.update('guru', existingGuru.id, guruData);
        const kep = DB.getAll('kepegawaian').find(k => k.guru_id === existingGuru.id);
        if (kep) {
          DB.update('kepegawaian', kep.id, {
            status_kepegawaian: row.status_kepegawaian,
            jabatan: row.jabatan,
            pangkat_golongan: row.pangkat_golongan,
            tmt_pengangkatan: row.tmt_pengangkatan,
            nomor_sk: row.nomor_sk
          });
        }
        updatedCount++;
      } else {
        // Insert Baru
        guruData.foto_url = generateAvatar(row.nama_lengkap);
        const inserted = DB.insert('guru', guruData);

        // Insert kepegawaian
        DB.insert('kepegawaian', {
          guru_id: inserted.id,
          status_kepegawaian: row.status_kepegawaian,
          jabatan: row.jabatan,
          pangkat_golongan: row.pangkat_golongan,
          tmt_pengangkatan: row.tmt_pengangkatan,
          nomor_sk: row.nomor_sk,
          instansi: 'Dinas Pendidikan',
          unit_kerja: 'SD Negeri Sumber Waru 2'
        });

        // Insert default beban mengajar
        DB.insert('beban_mengajar', {
          guru_id: inserted.id,
          jp_tatap_muka: 24,
          tugas_tambahan: '-',
          jp_tugas_tambahan: 0,
          ekstrakurikuler: '-',
          jp_ekskul: 0,
          keterangan: 'Memenuhi Beban Kerja'
        });

        insertedCount++;
      }
    });

    DB.logActivity('Import Data Guru', 'guru', `Berhasil import ${insertedCount} guru baru dan memperbarui ${updatedCount} guru dari file spreadsheet.`);

    App.showToast('Import Berhasil!', `Telah berhasil mengimport ${insertedCount} guru baru dan memperbarui ${updatedCount} guru.`, 'success');

    const modalEl = document.getElementById('modal-import-guru');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderTable();
    DashboardModule.init();
  }
};
