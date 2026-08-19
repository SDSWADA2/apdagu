/**
 * ============================================================================
 * MODUL BEBAN MENGAJAR & VALIDASI 24 JP
 * Lengkap dengan CRUD: Tambah, Edit, Hapus, dan Export Excel
 * ============================================================================
 */

const BebanMengajarModule = {
  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderList();
  },

  bindEvents() {
    const form = document.getElementById('form-beban');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveBeban();
      });

      // Auto-hitung total JP setiap kali input berubah
      ['form-beban-jp-tatap', 'form-beban-jp-tugas', 'form-beban-jp-ekskul'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => this.calculateTotalJP());
      });
    }
  },

  renderGuruSelect() {
    const formSelect = document.getElementById('form-beban-guru-id');
    if (!formSelect) return;
    const guruList = DB.getAll('guru');
    formSelect.innerHTML = `<option value="">-- Pilih Guru --</option>` +
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
      if (total >= 24) {
        validationEl.className = 'badge bg-success';
        validationEl.textContent = `✓ Terpenuhi (${total} JP)`;
      } else {
        validationEl.className = 'badge bg-danger';
        validationEl.textContent = `✗ Kurang ${24 - total} JP (${total} / 24 JP)`;
      }
    }
  },

  renderList() {
    const tbody = document.getElementById('beban-table-body');
    if (!tbody) return;

    const list = DB.getAll('beban_mengajar');

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada data beban mengajar.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((b, idx) => {
      const guru = DB.getById('guru', b.guru_id) || {};
      const totalJP = (parseInt(b.jp_tatap_muka) || 0) + (parseInt(b.jp_tugas_tambahan) || 0) + (parseInt(b.jp_ekskul) || 0);
      const validation = Helpers.validate24JP(totalJP);

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NUPTK: ${guru.nuptk || '-'}</small>
          </td>
          <td><strong>${b.jp_tatap_muka || 0} JP</strong></td>
          <td>
            <div>${b.tugas_tambahan || '-'}</div>
            <small class="text-primary fw-bold">${b.jp_tugas_tambahan ? b.jp_tugas_tambahan + ' JP' : ''}</small>
          </td>
          <td>
            <div>${b.ekstrakurikuler || '-'}</div>
            <small class="text-info fw-bold">${b.jp_ekskul ? b.jp_ekskul + ' JP' : ''}</small>
          </td>
          <td><strong class="fs-6 text-dark">${totalJP} JP</strong></td>
          <td>
            <span class="badge ${validation.badge}">
              <i class="bi ${validation.icon} me-1"></i>${validation.status}
            </span>
          </td>
          <td><small class="text-muted">${b.keterangan || '-'}</small></td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-dark p-1" onclick="BebanMengajarModule.printSKBK(${b.id})" title="Cetak SKBK 24 JP">
                <i class="bi bi-printer"></i>
              </button>
              <button class="btn btn-sm btn-outline-warning p-1" onclick="BebanMengajarModule.openEditModal(${b.id})" title="Edit">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger p-1" onclick="BebanMengajarModule.deleteBeban(${b.id})" title="Hapus">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-beban');
    if (!form) return;
    form.reset();
    document.getElementById('form-beban-id').value = '';
    document.getElementById('modal-beban-title').textContent = 'Tambah Data Beban Mengajar';
    document.getElementById('form-beban-jp-tatap').value = 24;
    document.getElementById('form-beban-jp-tugas').value = 0;
    document.getElementById('form-beban-jp-ekskul').value = 0;
    this.calculateTotalJP();

    const modal = new bootstrap.Modal(document.getElementById('modal-beban-form'));
    modal.show();
  },

  openEditModal(id) {
    const item = DB.getById('beban_mengajar', id);
    if (!item) return;

    document.getElementById('modal-beban-title').textContent = 'Edit Beban Mengajar';
    document.getElementById('form-beban-id').value = item.id;
    document.getElementById('form-beban-guru-id').value = item.guru_id;
    document.getElementById('form-beban-jp-tatap').value = item.jp_tatap_muka || 24;
    document.getElementById('form-beban-tugas').value = item.tugas_tambahan || '';
    document.getElementById('form-beban-jp-tugas').value = item.jp_tugas_tambahan || 0;
    document.getElementById('form-beban-ekskul').value = item.ekstrakurikuler || '';
    document.getElementById('form-beban-jp-ekskul').value = item.jp_ekskul || 0;
    document.getElementById('form-beban-ket').value = item.keterangan || '';
    this.calculateTotalJP();

    const modal = new bootstrap.Modal(document.getElementById('modal-beban-form'));
    modal.show();
  },

  saveBeban() {
    const id = document.getElementById('form-beban-id').value;
    const guruId = parseInt(document.getElementById('form-beban-guru-id').value);

    if (!guruId) {
      App.showToast('Peringatan', 'Pilih guru terlebih dahulu!', 'warning');
      return;
    }

    const data = {
      guru_id: guruId,
      jp_tatap_muka: parseInt(document.getElementById('form-beban-jp-tatap').value) || 24,
      tugas_tambahan: document.getElementById('form-beban-tugas').value.trim() || '-',
      jp_tugas_tambahan: parseInt(document.getElementById('form-beban-jp-tugas').value) || 0,
      ekstrakurikuler: document.getElementById('form-beban-ekskul').value.trim() || '-',
      jp_ekskul: parseInt(document.getElementById('form-beban-jp-ekskul').value) || 0,
      keterangan: document.getElementById('form-beban-ket').value.trim() || 'Memenuhi Beban Kerja'
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';
    const totalJP = data.jp_tatap_muka + data.jp_tugas_tambahan + data.jp_ekskul;

    if (!id) {
      // Cek apakah guru sudah punya data beban mengajar
      const existing = DB.getAll('beban_mengajar').find(b => b.guru_id === guruId);
      if (existing) {
        App.showConfirm('Konfirmasi Update', `${namaGuru} sudah memiliki data beban mengajar. Update data yang ada?`, () => {
          DB.update('beban_mengajar', existing.id, data, `Memperbarui beban mengajar ${namaGuru} (${totalJP} JP)`);
          App.showToast('Sukses', `Beban mengajar ${namaGuru} berhasil disimpan (Total: ${totalJP} JP).`, totalJP >= 24 ? 'success' : 'warning');
          const modalEl = document.getElementById('modal-beban-form');
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
          this.renderList();
          DashboardModule.renderCharts();
        });
        return; // Hentikan eksekusi sinkron karena pakai callback async
      } else {
        DB.insert('beban_mengajar', data, `Menambah beban mengajar ${namaGuru} (${totalJP} JP)`);
      }
      App.showToast('Sukses', `Beban mengajar ${namaGuru} berhasil disimpan (Total: ${totalJP} JP).`, totalJP >= 24 ? 'success' : 'warning');
    } else {
      DB.update('beban_mengajar', id, data, `Mengubah beban mengajar ${namaGuru} (${totalJP} JP)`);
      App.showToast('Sukses', `Beban mengajar ${namaGuru} berhasil diperbarui (Total: ${totalJP} JP).`, totalJP >= 24 ? 'success' : 'warning');
    }

    const modalEl = document.getElementById('modal-beban-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderList();
    DashboardModule.renderCharts();
  },

  deleteBeban(id) {
    const item = DB.getById('beban_mengajar', id);
    const guru = item ? DB.getById('guru', item.guru_id) : null;
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : 'ini';

    App.showConfirm('Hapus Data', `Hapus data beban mengajar untuk ${namaGuru}?`, () => {
      DB.delete('beban_mengajar', id, `Menghapus beban mengajar`);
      this.renderList();
      App.showToast('Dihapus', 'Data beban mengajar telah dihapus.', 'info');
    });
  },

  printSKBK(id) {
    const item = DB.getById('beban_mengajar', id);
    if (!item) return;
    const guru = DB.getById('guru', item.guru_id) || {};
    const kep = DB.getAll('kepegawaian').find(k => k.guru_id === guru.id) || {};
    const profil = DB.state.profil_sekolah || {};
    const totalJP = (parseInt(item.jp_tatap_muka) || 0) + (parseInt(item.jp_tugas_tambahan) || 0) + (parseInt(item.jp_ekskul) || 0);

    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-3">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">SURAT KETERANGAN PEMENUHAN BEBAN KERJA GURU (SKBK)</h4>
        <small>Nomor: 421.2 / 089 / 426.202 / 2026</small>
      </div>

      <p style="margin-top: 15px;">Yang bertanda tangan di bawah ini, Kepala Sekolah ${profil.nama_sekolah || 'SD Negeri Sumber Waru 2'}, menerangkan bahwa:</p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10.5pt;">
        <tr><td style="width: 25%; padding: 4px;">Nama Lengkap</td><td style="width: 3%;">:</td><td><strong>${Helpers.formatNamaGelar(guru)}</strong></td></tr>
        <tr><td style="padding: 4px;">NIP</td><td>:</td><td>${guru.nip || '-'}</td></tr>
        <tr><td style="padding: 4px;">NUPTK</td><td>:</td><td>${guru.nuptk || '-'}</td></tr>
        <tr><td style="padding: 4px;">Pangkat / Golongan</td><td>:</td><td>${kep.pangkat_golongan || '-'}</td></tr>
        <tr><td style="padding: 4px;">Jabatan Guru</td><td>:</td><td>${kep.jabatan || 'Guru Kelas'}</td></tr>
      </table>

      <p>Telah aktif melaksanakan tugas pembelajaran dan tugas tambahan pada Semester Ganjil/Genap Tahun Ajaran 2026/2027 dengan rincian beban kerja sebagai berikut:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">No</th>
            <th style="border: 1px solid #000; padding: 6px;">Rincian Tugas & Aktivitas</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Ekuivalensi JP</th>
            <th style="border: 1px solid #000; padding: 6px;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">1</td>
            <td style="border: 1px solid #000; padding: 6px;">Tatap Muka Pembelajaran Reguler</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px; font-weight: bold;">${item.jp_tatap_muka} JP</td>
            <td style="border: 1px solid #000; padding: 6px;">Intrakurikuler</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">2</td>
            <td style="border: 1px solid #000; padding: 6px;">Tugas Tambahan: ${item.tugas_tambahan || '-'}</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px; font-weight: bold;">${item.jp_tugas_tambahan} JP</td>
            <td style="border: 1px solid #000; padding: 6px;">Tugas Tambahan Sekolah</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">3</td>
            <td style="border: 1px solid #000; padding: 6px;">Pembina Ekstrakurikuler: ${item.ekstrakurikuler || '-'}</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px; font-weight: bold;">${item.jp_ekskul} JP</td>
            <td style="border: 1px solid #000; padding: 6px;">Ko-kurikuler / Ekskul</td>
          </tr>
          <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="2" style="border: 1px solid #000; text-align: right; padding: 6px;">TOTAL BEBAN KERJA MINGGUAN:</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px; color: #2563eb;">${totalJP} JP</td>
            <td style="border: 1px solid #000; padding: 6px; color: ${totalJP >= 24 ? 'green' : 'red'};">${totalJP >= 24 ? 'MEMENUHI SYARAT 24 JP' : 'BELUM MEMENUHI 24 JP'}</td>
          </tr>
        </tbody>
      </table>

      <p>Demikian Surat Keterangan Beban Kerja ini dibuat dengan sebenarnya untuk dipergunakan sebagai kelengkapan administrasi Tunjangan Profesi Pendidik (TPP/TPG) dan pembinaan kepegawaian.</p>

      <div style="display: flex; justify-content: flex-end; margin-top: 35px; page-break-inside: avoid;">
        ${App.getTandaTanganKS(Helpers.formatDateIndo(new Date().toISOString().slice(0, 10)))}
      </div>
    `;

    window.print();
  },

  exportExcel() {
    LaporanModule.exportBebanExcel();
  }
};
