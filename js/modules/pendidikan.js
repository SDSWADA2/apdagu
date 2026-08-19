/**
 * ============================================================================
 * MODUL RIWAYAT PENDIDIKAN GURU & KUALIFIKASI AKADEMIK (DISEMPURNAKAN)
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const PendidikanModule = {
  selectedGuruId: 'all',

  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderKPIs();
    this.renderList();
  },

  bindEvents() {
    const filterSelect = document.getElementById('filter-pendidikan-guru');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.selectedGuruId = e.target.value;
        this.renderList();
      });
    }

    const form = document.getElementById('form-pendidikan');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePendidikan();
      });
    }
  },

  renderGuruSelect() {
    const filterSelect = document.getElementById('filter-pendidikan-guru');
    const formGuruSelect = document.getElementById('form-pendidikan-guru-id');
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');

    const options = guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');

    if (filterSelect) {
      filterSelect.innerHTML = `<option value="all">-- Semua Guru --</option>${options}`;
    }
    if (formGuruSelect) {
      formGuruSelect.innerHTML = `<option value="">-- Pilih Guru --</option>${options}`;
    }
  },

  renderKPIs() {
    const list = DB.getAll('pendidikan');
    let s2Count = 0, s1Count = 0, d3Count = 0;

    list.forEach(p => {
      if (p.jenjang === 'S2' || p.jenjang === 'S3') s2Count++;
      else if (p.jenjang === 'S1' || p.jenjang === 'D4') s1Count++;
      else d3Count++;
    });

    const update = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    update('stat-pendidikan-s2', s2Count);
    update('stat-pendidikan-s1', s1Count);
  },

  renderList() {
    const tbody = document.getElementById('pendidikan-table-body');
    if (!tbody) return;

    let list = DB.getAll('pendidikan');
    if (this.selectedGuruId !== 'all') {
      list = list.filter(p => p.guru_id == this.selectedGuruId);
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data riwayat pendidikan pada filter ini.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((p, idx) => {
      const guru = DB.getById('guru', p.guru_id) || {};
      const badgeJenjang = p.jenjang === 'S2' ? 'bg-purple' : (p.jenjang === 'S1' ? 'bg-primary' : 'bg-info');

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NUPTK: ${guru.nuptk || '-'}</small>
          </td>
          <td><span class="badge ${badgeJenjang} text-white fw-bold">${p.jenjang}</span></td>
          <td><strong>${p.nama_institusi}</strong></td>
          <td>${p.program_studi}</td>
          <td class="text-center">${p.tahun_masuk} - ${p.tahun_lulus}</td>
          <td class="text-center"><strong class="text-success">${p.ipk || '-'}</strong></td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-warning p-1" onclick="PendidikanModule.openEditModal(${p.id})" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger p-1" onclick="PendidikanModule.deletePendidikan(${p.id})" title="Hapus"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-pendidikan');
    if (!form) return;
    form.reset();
    document.getElementById('form-pendidikan-id').value = '';
    document.getElementById('modal-pendidikan-title').textContent = 'Tambah Riwayat Pendidikan';
    this.renderGuruSelect();

    const modal = new bootstrap.Modal(document.getElementById('modal-pendidikan-form'));
    modal.show();
  },

  openEditModal(id) {
    const item = DB.getById('pendidikan', id);
    if (!item) return;

    this.renderGuruSelect();
    document.getElementById('modal-pendidikan-title').textContent = 'Edit Riwayat Pendidikan';
    document.getElementById('form-pendidikan-id').value = item.id;
    document.getElementById('form-pendidikan-guru-id').value = item.guru_id;
    document.getElementById('form-pendidikan-jenjang').value = item.jenjang;
    document.getElementById('form-pendidikan-institusi').value = item.nama_institusi;
    document.getElementById('form-pendidikan-prodi').value = item.program_studi;
    document.getElementById('form-pendidikan-tahun-masuk').value = item.tahun_masuk;
    document.getElementById('form-pendidikan-tahun-lulus').value = item.tahun_lulus;
    document.getElementById('form-pendidikan-ipk').value = item.ipk || '';
    document.getElementById('form-pendidikan-no-ijazah').value = item.nomor_ijazah || '';

    const modal = new bootstrap.Modal(document.getElementById('modal-pendidikan-form'));
    modal.show();
  },

  savePendidikan() {
    const id = document.getElementById('form-pendidikan-id').value;
    const guruId = parseInt(document.getElementById('form-pendidikan-guru-id').value);
    const institusi = document.getElementById('form-pendidikan-institusi').value.trim();

    if (!guruId || !institusi) {
      App.showToast('Peringatan', 'Pilih guru dan masukkan nama institusi!', 'warning');
      return;
    }

    const data = {
      guru_id: guruId,
      jenjang: document.getElementById('form-pendidikan-jenjang').value,
      nama_institusi: institusi,
      program_studi: document.getElementById('form-pendidikan-prodi').value.trim(),
      tahun_masuk: parseInt(document.getElementById('form-pendidikan-tahun-masuk').value) || 2015,
      tahun_lulus: parseInt(document.getElementById('form-pendidikan-tahun-lulus').value) || 2019,
      ipk: parseFloat(document.getElementById('form-pendidikan-ipk').value) || 3.50,
      nomor_ijazah: document.getElementById('form-pendidikan-no-ijazah').value.trim()
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';

    if (!id) {
      DB.insert('pendidikan', data, `Menambah riwayat pendidikan ${data.jenjang} untuk ${namaGuru}`);
      App.showToast('Sukses', 'Riwayat pendidikan berhasil ditambahkan.', 'success');
    } else {
      DB.update('pendidikan', id, data, `Mengubah riwayat pendidikan ${data.jenjang} untuk ${namaGuru}`);
      App.showToast('Sukses', 'Riwayat pendidikan berhasil diperbarui.', 'success');
    }

    const modalEl = document.getElementById('modal-pendidikan-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderKPIs();
    this.renderList();
    DashboardModule.renderCharts();
  },

  deletePendidikan(id) {
    App.showConfirm('Hapus Data', 'Hapus riwayat pendidikan ini?', () => {
      DB.delete('pendidikan', id, 'Menghapus data riwayat pendidikan');
      this.renderKPIs();
      this.renderList();
      DashboardModule.renderCharts();
      App.showToast('Dihapus', 'Data pendidikan telah dihapus.', 'info');
    });
  },

  printPendidikan() {
    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    let list = DB.getAll('pendidikan');
    if (this.selectedGuruId !== 'all') list = list.filter(p => p.guru_id == this.selectedGuruId);
    const profil = DB.state.profil_sekolah || {};

    const rows = list.map((p, idx) => {
      const g = DB.getById('guru', p.guru_id) || {};
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px;"><strong>${Helpers.formatNamaGelar(g)}</strong></td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px; font-weight: bold;">${p.jenjang}</td>
          <td style="border: 1px solid #000; padding: 5px;">${p.nama_institusi}</td>
          <td style="border: 1px solid #000; padding: 5px;">${p.program_studi}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${p.tahun_masuk} - ${p.tahun_lulus}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${p.ipk || '-'}</td>
          <td style="border: 1px solid #000; padding: 5px;"><small>${p.nomor_ijazah || '-'}</small></td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-3">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">REKAPITULASI KUALIFIKASI PENDIDIKAN FORMAL GURU</h4>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">No</th>
            <th style="border: 1px solid #000; padding: 6px;">Nama Guru</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Jenjang</th>
            <th style="border: 1px solid #000; padding: 6px;">Perguruan Tinggi / Institusi</th>
            <th style="border: 1px solid #000; padding: 6px;">Program Studi</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Tahun</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">IPK</th>
            <th style="border: 1px solid #000; padding: 6px;">No. Ijazah</th>
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
    LaporanModule.exportPendidikanExcel();
  }
};
