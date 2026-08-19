/**
 * ============================================================================
 * MODUL SERTIFIKASI GURU (PPG & SERTIFIKAT PENDIDIK) (DISEMPURNAKAN)
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const SertifikasiModule = {
  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderKPIs();
    this.renderList();
  },

  bindEvents() {
    const form = document.getElementById('form-sertifikasi');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSertifikasi();
      });
    }
  },

  renderGuruSelect() {
    const formSelect = document.getElementById('form-sertifikasi-guru-id');
    if (!formSelect) return;
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    formSelect.innerHTML = `<option value="">-- Pilih Guru --</option>` + 
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)} (${g.nuptk || 'NUPTK -'})</option>`).join('');
  },

  renderKPIs() {
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const sertifikasiList = DB.getAll('sertifikasi');

    const totalGuru = guruList.length || 1;
    const certified = sertifikasiList.filter(s => s.status_berlaku === 'Aktif').length;
    const pct = Math.round((certified / totalGuru) * 100);

    const update = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    update('stat-guru-sertifikasi', certified);
  },

  renderList() {
    const tbody = document.getElementById('sertifikasi-table-body');
    if (!tbody) return;

    const list = DB.getAll('sertifikasi');

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data sertifikasi pendidik.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((s, idx) => {
      const guru = DB.getById('guru', s.guru_id) || {};
      const hasNRG = !!s.nomor_registrasi_guru && s.nomor_registrasi_guru !== '-';

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NUPTK: ${guru.nuptk || '-'}</small>
          </td>
          <td><strong class="text-primary">${s.bidang_studi}</strong></td>
          <td><code>${s.nomor_sertifikat}</code></td>
          <td>
            ${hasNRG ? `<span class="badge bg-success-subtle text-success border fw-bold">${s.nomor_registrasi_guru}</span>` : '<span class="text-muted small">Belum Terbit</span>'}
          </td>
          <td>${s.lptk_penyelenggara} (${s.tahun_sertifikasi})</td>
          <td><span class="badge bg-success">${s.status_berlaku || 'Aktif'}</span></td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-warning p-1" onclick="SertifikasiModule.openEditModal(${s.id})" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger p-1" onclick="SertifikasiModule.deleteSertifikasi(${s.id})" title="Hapus"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-sertifikasi');
    if (!form) return;
    form.reset();
    document.getElementById('form-sertifikasi-id').value = '';
    document.getElementById('form-sertifikasi-tahun').value = new Date().getFullYear();
    document.getElementById('modal-sertifikasi-title').textContent = 'Tambah Data Sertifikasi Pendidik';
    this.renderGuruSelect();

    const modal = new bootstrap.Modal(document.getElementById('modal-sertifikasi-form'));
    modal.show();
  },

  openEditModal(id) {
    const item = DB.getById('sertifikasi', id);
    if (!item) return;

    this.renderGuruSelect();
    document.getElementById('modal-sertifikasi-title').textContent = 'Edit Data Sertifikasi Pendidik';
    document.getElementById('form-sertifikasi-id').value = item.id;
    document.getElementById('form-sertifikasi-guru-id').value = item.guru_id;
    document.getElementById('form-sertifikasi-no').value = item.nomor_sertifikat;
    document.getElementById('form-sertifikasi-bidang').value = item.bidang_studi;
    document.getElementById('form-sertifikasi-tahun').value = item.tahun_sertifikasi;
    document.getElementById('form-sertifikasi-lptk').value = item.lptk_penyelenggara;
    document.getElementById('form-sertifikasi-nrg').value = item.nomor_registrasi_guru || '';
    document.getElementById('form-sertifikasi-status').value = item.status_berlaku || 'Aktif';

    const modal = new bootstrap.Modal(document.getElementById('modal-sertifikasi-form'));
    modal.show();
  },

  saveSertifikasi() {
    const id = document.getElementById('form-sertifikasi-id').value;
    const guruId = parseInt(document.getElementById('form-sertifikasi-guru-id').value);
    const noSertifikat = document.getElementById('form-sertifikasi-no').value.trim();

    if (!guruId || !noSertifikat) {
      App.showToast('Peringatan', 'Pilih guru dan masukkan nomor sertifikat!', 'warning');
      return;
    }

    const data = {
      guru_id: guruId,
      nomor_sertifikat: noSertifikat,
      bidang_studi: document.getElementById('form-sertifikasi-bidang').value.trim(),
      tahun_sertifikasi: parseInt(document.getElementById('form-sertifikasi-tahun').value) || new Date().getFullYear(),
      lptk_penyelenggara: document.getElementById('form-sertifikasi-lptk').value.trim(),
      nomor_registrasi_guru: document.getElementById('form-sertifikasi-nrg').value.trim(),
      status_berlaku: document.getElementById('form-sertifikasi-status').value
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';

    if (!id) {
      DB.insert('sertifikasi', data, `Menambah data sertifikasi pendidik untuk ${namaGuru}`);
      App.showToast('Sukses', 'Data sertifikasi berhasil ditambahkan.', 'success');
    } else {
      DB.update('sertifikasi', id, data, `Mengubah data sertifikasi pendidik untuk ${namaGuru}`);
      App.showToast('Sukses', 'Data sertifikasi berhasil diperbarui.', 'success');
    }

    const modalEl = document.getElementById('modal-sertifikasi-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderKPIs();
    this.renderList();
    DashboardModule.init();
  },

  deleteSertifikasi(id) {
    App.showConfirm('Hapus Data', 'Hapus data sertifikasi ini?', () => {
      DB.delete('sertifikasi', id, 'Menghapus data sertifikasi');
      this.renderKPIs();
      this.renderList();
      DashboardModule.init();
      App.showToast('Dihapus', 'Data sertifikasi telah dihapus.', 'info');
    });
  },

  printSertifikasi() {
    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    const list = DB.getAll('sertifikasi');
    const profil = DB.state.profil_sekolah || {};

    const rows = list.map((s, idx) => {
      const g = DB.getById('guru', s.guru_id) || {};
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px;"><strong>${Helpers.formatNamaGelar(g)}</strong><br><small>NUPTK: ${g.nuptk || '-'}</small></td>
          <td style="border: 1px solid #000; padding: 5px;">${s.bidang_studi}</td>
          <td style="border: 1px solid #000; padding: 5px; font-family: monospace;">${s.nomor_sertifikat}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px; font-weight: bold;">${s.nomor_registrasi_guru || '-'}</td>
          <td style="border: 1px solid #000; padding: 5px;">${s.lptk_penyelenggara}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${s.tahun_sertifikasi}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${s.status_berlaku}</td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-3">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">REKAPITULASI SERTIFIKASI PENDIDIK & NOMOR REGISTRASI GURU (NRG)</h4>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">No</th>
            <th style="border: 1px solid #000; padding: 6px;">Nama Guru & NUPTK</th>
            <th style="border: 1px solid #000; padding: 6px;">Bidang Studi</th>
            <th style="border: 1px solid #000; padding: 6px;">No. Sertifikat</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">NRG</th>
            <th style="border: 1px solid #000; padding: 6px;">LPTK Penyelenggara</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Tahun</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Status</th>
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
    LaporanModule.exportSertifikasiExcel();
  }
};
