/**
 * ============================================================================
 * MODUL KEPEGAWAIAN, MASA KERJA & TRACKER KGB / KENAIKAN PANGKAT (DISEMPURNAKAN)
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const KepegawaianModule = {
  filterStatus: 'all',

  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderKPIs();
    this.renderList();
  },

  bindEvents() {
    const form = document.getElementById('form-kepegawaian');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveKepegawaian();
      });
    }

    const filterStatus = document.getElementById('filter-kepegawaian-status');
    if (filterStatus) {
      filterStatus.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.renderList();
      });
    }
  },

  renderGuruSelect() {
    const formSelect = document.getElementById('form-kepegawaian-guru-id');
    if (!formSelect) return;
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    formSelect.innerHTML = `<option value="">-- Pilih Guru / PTK --</option>` + 
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)} (${g.nip || g.nuptk || 'NIP -'})</option>`).join('');
  },

  renderKPIs() {
    const kepList = DB.getAll('kepegawaian');
    let pns = 0, pppk = 0, honorer = 0, kgbKpThisYear = 0;
    const currentYear = new Date().getFullYear();

    kepList.forEach(k => {
      if (k.status_kepegawaian === 'PNS') pns++;
      else if (k.status_kepegawaian === 'PPPK') pppk++;
      else honorer++;

      if (k.tmt_pengangkatan) {
        const tmt = new Date(k.tmt_pengangkatan);
        const tmtYear = tmt.getFullYear();
        const diff = currentYear - tmtYear;
        // KGB tiap 2 tahun
        if (diff % 2 === 0 && diff > 0) {
          kgbKpThisYear++;
        }
      }
    });

    const update = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    update('kep-total-pns', pns);
    update('kep-total-pppk', pppk);
    update('kep-total-honorer', honorer);
    update('kep-total-kgb-kp', `${kgbKpThisYear} Guru`);
  },

  renderList() {
    const tbody = document.getElementById('kepegawaian-table-body');
    if (!tbody) return;

    let kepList = DB.getAll('kepegawaian');
    if (this.filterStatus !== 'all') {
      kepList = kepList.filter(k => k.status_kepegawaian === this.filterStatus || (this.filterStatus === 'Honorer' && k.status_kepegawaian.includes('Honorer')));
    }

    if (kepList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada data kepegawaian sesuai filter.</td></tr>`;
      return;
    }

    const currentYear = new Date().getFullYear();

    tbody.innerHTML = kepList.map((k, idx) => {
      const guru = DB.getById('guru', k.guru_id) || {};
      const masaKerja = Helpers.calculateMasaKerja(k.tmt_pengangkatan);

      const statusBadges = {
        'PNS': '<span class="badge-custom badge-pns"><i class="bi bi-person-badge me-1"></i>PNS</span>',
        'PPPK': '<span class="badge-custom badge-pppk"><i class="bi bi-patch-check me-1"></i>PPPK</span>',
        'Honorer Sekolah (BOS)': '<span class="badge-custom badge-honorer">Honorer BOS</span>',
        'Honorer Daerah': '<span class="badge-custom badge-honorer">Honorer Daerah</span>',
        'GTY': '<span class="badge-custom badge-honorer">GTY</span>'
      };

      // Hitung Estimasi KGB (Kenaikan Gaji Berkala tiap 2 th) & KP (Kenaikan Pangkat tiap 4 th)
      let trackerHtml = '<span class="text-muted small">-</span>';
      if (k.tmt_pengangkatan) {
        const tmt = new Date(k.tmt_pengangkatan);
        const tmtYear = tmt.getFullYear();
        const diffYears = currentYear - tmtYear;
        const nextKGBYear = tmtYear + (Math.floor(diffYears / 2) + 1) * 2;
        const nextKPYear = tmtYear + (Math.floor(diffYears / 4) + 1) * 4;

        if (nextKGBYear === currentYear) {
          trackerHtml = `<span class="badge bg-warning text-dark" title="Jatuh tempo KGB tahun ini"><i class="bi bi-exclamation-circle me-1"></i>KGB ${nextKGBYear}</span>`;
        } else if (k.status_kepegawaian === 'PNS' && nextKPYear === currentYear) {
          trackerHtml = `<span class="badge bg-primary" title="Jatuh tempo Kenaikan Pangkat"><i class="bi bi-arrow-up-circle me-1"></i>KP ${nextKPYear}</span>`;
        } else {
          trackerHtml = `<small class="text-muted">KGB: ${nextKGBYear}</small>`;
        }
      }

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <img src="${guru.foto_url || generateAvatar(guru.nama_lengkap || 'G')}" class="avatar-teacher" alt="${guru.nama_lengkap}">
              <div>
                <div class="fw-bold text-dark">${Helpers.formatNamaGelar(guru)}</div>
                <small class="text-muted">NIP: ${guru.nip || '-'}</small>
              </div>
            </div>
          </td>
          <td>${statusBadges[k.status_kepegawaian] || `<span class="badge bg-secondary">${k.status_kepegawaian}</span>`}</td>
          <td><strong>${k.jabatan || 'Guru'}</strong></td>
          <td><span class="badge bg-light text-dark border">${k.pangkat_golongan || '-'}</span></td>
          <td>${Helpers.formatDateIndo(k.tmt_pengangkatan)}</td>
          <td><strong class="text-primary">${masaKerja.text}</strong></td>
          <td>${trackerHtml}</td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-warning p-1" onclick="KepegawaianModule.openEditModal(${k.id})" title="Edit Kepegawaian"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger p-1" onclick="KepegawaianModule.deleteKepegawaian(${k.id})" title="Hapus"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-kepegawaian');
    if (!form) return;
    form.reset();
    document.getElementById('form-kepegawaian-id').value = '';
    document.getElementById('modal-kepegawaian-title').textContent = 'Tambah Data Kepegawaian';
    this.renderGuruSelect();

    const modal = new bootstrap.Modal(document.getElementById('modal-kepegawaian-form'));
    modal.show();
  },

  openEditModal(id) {
    const item = DB.getById('kepegawaian', id);
    if (!item) return;

    this.renderGuruSelect();
    document.getElementById('modal-kepegawaian-title').textContent = 'Edit Data Kepegawaian';
    document.getElementById('form-kepegawaian-id').value = item.id;
    document.getElementById('form-kepegawaian-guru-id').value = item.guru_id;
    document.getElementById('form-kepegawaian-status').value = item.status_kepegawaian || 'PNS';
    document.getElementById('form-kepegawaian-jabatan').value = item.jabatan || '';
    document.getElementById('form-kepegawaian-pangkat').value = item.pangkat_golongan || '-';
    document.getElementById('form-kepegawaian-tmt').value = item.tmt_pengangkatan || '';
    document.getElementById('form-kepegawaian-sk').value = item.nomor_sk || '';
    document.getElementById('form-kepegawaian-pejabat').value = item.pejabat_pengangkat || 'Bupati Pamekasan';
    document.getElementById('form-kepegawaian-gaji').value = item.gaji_pokok || '';

    const modal = new bootstrap.Modal(document.getElementById('modal-kepegawaian-form'));
    modal.show();
  },

  saveKepegawaian() {
    const id = document.getElementById('form-kepegawaian-id').value;
    const guruId = parseInt(document.getElementById('form-kepegawaian-guru-id').value);
    const jabatan = document.getElementById('form-kepegawaian-jabatan').value.trim();

    if (!guruId || !jabatan) {
      App.showToast('Peringatan', 'Pilih guru dan masukkan jabatan!', 'warning');
      return;
    }

    const data = {
      guru_id: guruId,
      status_kepegawaian: document.getElementById('form-kepegawaian-status').value,
      jabatan: jabatan,
      pangkat_golongan: document.getElementById('form-kepegawaian-pangkat').value,
      tmt_pengangkatan: document.getElementById('form-kepegawaian-tmt').value || new Date().toISOString().slice(0, 10),
      nomor_sk: document.getElementById('form-kepegawaian-sk').value.trim(),
      pejabat_pengangkat: document.getElementById('form-kepegawaian-pejabat').value.trim(),
      gaji_pokok: parseInt(document.getElementById('form-kepegawaian-gaji').value) || 0
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';

    if (!id) {
      DB.insert('kepegawaian', data, `Tambah data kepegawaian untuk ${namaGuru}`);
      App.showToast('Sukses', `Data kepegawaian ${namaGuru} berhasil ditambahkan.`, 'success');
    } else {
      DB.update('kepegawaian', id, data, `Update data kepegawaian untuk ${namaGuru}`);
      App.showToast('Sukses', `Data kepegawaian ${namaGuru} berhasil diperbarui.`, 'success');
    }

    const modalEl = document.getElementById('modal-kepegawaian-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderKPIs();
    this.renderList();
    DashboardModule.init();
  },

  deleteKepegawaian(id) {
    App.showConfirm('Hapus Data', 'Hapus data kepegawaian ini?', () => {
      DB.delete('kepegawaian', id, 'Menghapus data kepegawaian guru');
      this.renderKPIs();
      this.renderList();
      DashboardModule.init();
      App.showToast('Dihapus', 'Data kepegawaian telah dihapus.', 'info');
    });
  },

  printKepegawaian() {
    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    const list = DB.getAll('kepegawaian');
    const profil = DB.state.profil_sekolah || {};

    const rows = list.map((k, idx) => {
      const g = DB.getById('guru', k.guru_id) || {};
      const masaKerja = Helpers.calculateMasaKerja(k.tmt_pengangkatan);
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px;"><strong>${Helpers.formatNamaGelar(g)}</strong><br><small>NIP. ${g.nip || '-'}</small></td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${k.status_kepegawaian}</td>
          <td style="border: 1px solid #000; padding: 5px;">${k.jabatan}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${k.pangkat_golongan}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${Helpers.formatDateIndo(k.tmt_pengangkatan)}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${masaKerja.text}</td>
          <td style="border: 1px solid #000; padding: 5px;"><small>${k.nomor_sk || '-'}</small></td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-3">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">DAFTAR REKAPITULASI KEPEGAWAIAN GURU & PTK</h4>
        <small>Tahun Ajaran 2026/2027</small>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">No</th>
            <th style="border: 1px solid #000; padding: 6px;">Nama Lengkap & NIP</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Status</th>
            <th style="border: 1px solid #000; padding: 6px;">Jabatan</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Pangkat/Gol.</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">TMT</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Masa Kerja</th>
            <th style="border: 1px solid #000; padding: 6px;">No. SK Pengangkatan</th>
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
    LaporanModule.exportNIPExcel();
  }
};
