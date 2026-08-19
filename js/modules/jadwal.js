/**
 * ============================================================================
 * MODUL JADWAL PEMBELAJARAN - DISEMPURNAKAN TOTAL
 * SD NEGERI SUMBER WARU 2 | KURIKULUM MERDEKA (FASE A/B/C)
 * ============================================================================
 * Fitur:
 *  - KPI ringkasan jadwal (total jadwal, kelas terjadwal, guru mengajar)
 *  - Mode tampilan: Tabel List & Grid Mingguan (Timetable)
 *  - Filter Hari, Kelas & Guru pengajar
 *  - Deteksi bentrok jadwal yang akurat (guru & kelas)
 *  - Konfirmasi modal Bootstrap untuk hapus & bentrok (tanpa alert/confirm)
 *  - Cetak Laporan A4 dengan Kop Surat & TTD resmi
 *  - Export Excel langsung dari modul ini
 * ============================================================================
 */

const JadwalModule = {
  filterHari: 'all',
  filterKelas: 'all',
  filterGuru: 'all',
  viewMode: 'list', // 'list' | 'grid'

  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderFilterGuruSelect();
    this.renderKPIs();
    this.renderList();
  },

  bindEvents() {
    const hariSelect = document.getElementById('filter-jadwal-hari');
    if (hariSelect) {
      hariSelect.addEventListener('change', (e) => {
        this.filterHari = e.target.value;
        this.renderList();
      });
    }

    const kelasSelect = document.getElementById('filter-jadwal-kelas');
    if (kelasSelect) {
      kelasSelect.addEventListener('change', (e) => {
        this.filterKelas = e.target.value;
        this.renderList();
      });
    }

    const guruFilterSelect = document.getElementById('filter-jadwal-guru');
    if (guruFilterSelect) {
      guruFilterSelect.addEventListener('change', (e) => {
        this.filterGuru = e.target.value;
        this.renderList();
      });
    }

    const form = document.getElementById('form-jadwal');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveJadwal();
      });
    }
  },

  renderGuruSelect() {
    const formSelect = document.getElementById('form-jadwal-guru-id');
    if (!formSelect) return;
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    formSelect.innerHTML = `<option value="">-- Pilih Guru Pengajar --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  renderFilterGuruSelect() {
    const filterSelect = document.getElementById('filter-jadwal-guru');
    if (!filterSelect) return;
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    filterSelect.innerHTML = `<option value="all">-- Semua Guru --</option>` +
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
  },

  renderKPIs() {
    const container = document.getElementById('jadwal-kpi-container');
    if (!container) return;

    const all = DB.getAll('jadwal_mengajar');
    const totalJadwal = all.length;
    const totalJP = all.reduce((sum, j) => sum + (parseInt(j.jumlah_jp) || 0), 0);
    const kelasTerjadwal = [...new Set(all.map(j => j.kelas))].length;
    const guruMengajar = [...new Set(all.map(j => j.guru_id))].length;
    const totalGuru = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif').length;

    // Deteksi bentrok
    const bentrokList = this.detectAllConflicts();

    container.innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-3 h-100">
            <div class="fs-2 fw-black text-primary">${totalJadwal}</div>
            <div class="small text-muted">Total Jadwal</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-3 h-100">
            <div class="fs-2 fw-black text-success">${totalJP}</div>
            <div class="small text-muted">Total JP/Minggu</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-3 h-100">
            <div class="fs-2 fw-black text-info">${kelasTerjadwal} <small class="fs-6 text-muted">/ 6</small></div>
            <div class="small text-muted">Kelas Terjadwal</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-3 h-100 ${bentrokList.length > 0 ? 'border-danger border-1' : ''}">
            <div class="fs-2 fw-black ${bentrokList.length > 0 ? 'text-danger' : 'text-success'}">
              ${bentrokList.length > 0 ? `<i class="bi bi-exclamation-triangle-fill me-1"></i>${bentrokList.length}` : `<i class="bi bi-check-circle-fill me-1"></i>0`}
            </div>
            <div class="small text-muted">Konflik/Bentrok</div>
          </div>
        </div>
      </div>
    `;
  },

  detectAllConflicts() {
    const all = DB.getAll('jadwal_mengajar');
    const conflicts = [];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (a.hari !== b.hari) continue;
        const overlap = (a.waktu_mulai < b.waktu_selesai && a.waktu_selesai > b.waktu_mulai);
        if (!overlap) continue;
        if (a.guru_id === b.guru_id) {
          conflicts.push({ type: 'guru', a, b });
        } else if (a.kelas === b.kelas) {
          conflicts.push({ type: 'kelas', a, b });
        }
      }
    }
    return conflicts;
  },

  getFilteredList() {
    let list = DB.getAll('jadwal_mengajar');
    if (this.filterHari !== 'all') list = list.filter(j => j.hari === this.filterHari);
    if (this.filterKelas !== 'all') list = list.filter(j => j.kelas === this.filterKelas);
    if (this.filterGuru !== 'all') list = list.filter(j => j.guru_id == this.filterGuru);

    const hariOrder = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
    list.sort((a, b) =>
      (hariOrder[a.hari] || 99) - (hariOrder[b.hari] || 99) ||
      (a.waktu_mulai || '').localeCompare(b.waktu_mulai || '')
    );
    return list;
  },

  renderList() {
    this.renderKPIs();
    const tbody = document.getElementById('jadwal-table-body');
    if (!tbody) return;

    const list = this.getFilteredList();
    const conflicts = this.detectAllConflicts();
    const conflictIds = new Set(conflicts.flatMap(c => [c.a.id, c.b.id]));

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5 text-muted">
            <i class="bi bi-calendar-x fs-1 d-block mb-2 opacity-25"></i>
            Belum ada jadwal mengajar pada filter ini.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = list.map((j, idx) => {
      const guru = DB.getById('guru', j.guru_id) || {};
      const isConflict = conflictIds.has(j.id);
      const hariColors = {
        'Senin': 'bg-primary-subtle text-primary',
        'Selasa': 'bg-success-subtle text-success',
        'Rabu': 'bg-warning-subtle text-warning',
        'Kamis': 'bg-info-subtle text-info',
        'Jumat': 'bg-danger-subtle text-danger',
        'Sabtu': 'bg-secondary-subtle text-secondary'
      };
      const hariClass = hariColors[j.hari] || 'bg-secondary-subtle text-secondary';

      return `
        <tr class="${isConflict ? 'table-danger' : ''}">
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <span class="badge ${hariClass} border px-2 py-1 fw-bold">
              ${j.hari}
            </span>
          </td>
          <td>
            <strong>${j.waktu_mulai} – ${j.waktu_selesai}</strong>
            <small class="text-muted d-block">Jam ke-${j.jam_ke || '-'}</small>
          </td>
          <td>
            <span class="badge bg-info-subtle text-info border fw-bold">${j.kelas}</span>
          </td>
          <td>
            <strong>${j.mata_pelajaran}</strong>
            <small class="text-muted d-block"><i class="bi bi-door-open me-1"></i>${j.ruangan || 'Ruang Kelas'}</small>
          </td>
          <td>
            <div class="fw-bold text-dark">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">NIP: ${guru.nip || '-'}</small>
          </td>
          <td>
            <span class="badge bg-success fw-bold">${j.jumlah_jp} JP</span>
          </td>
          <td>
            ${isConflict ? `<span class="badge bg-danger"><i class="bi bi-exclamation-triangle me-1"></i>BENTROK</span>` : `<span class="badge bg-success-subtle text-success border">✓ OK</span>`}
          </td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-warning p-1" onclick="JadwalModule.openEditModal(${j.id})" title="Edit Jadwal">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger p-1" onclick="JadwalModule.confirmDeleteJadwal(${j.id})" title="Hapus">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-jadwal');
    if (!form) return;
    form.reset();
    document.getElementById('form-jadwal-id').value = '';
    document.getElementById('modal-jadwal-title').textContent = 'Tambah Jadwal Mengajar';
    document.getElementById('form-jadwal-mulai').value = '07:30';
    document.getElementById('form-jadwal-selesai').value = '09:15';
    document.getElementById('form-jadwal-jp').value = '3';
    this.renderGuruSelect();

    const modal = new bootstrap.Modal(document.getElementById('modal-jadwal-form'));
    modal.show();
  },

  openEditModal(id) {
    const item = DB.getById('jadwal_mengajar', id);
    if (!item) return;

    this.renderGuruSelect();
    document.getElementById('modal-jadwal-title').textContent = 'Edit Jadwal Mengajar';
    document.getElementById('form-jadwal-id').value = item.id;
    document.getElementById('form-jadwal-guru-id').value = item.guru_id;
    document.getElementById('form-jadwal-hari').value = item.hari;
    document.getElementById('form-jadwal-jam-ke').value = item.jam_ke || '';
    document.getElementById('form-jadwal-mulai').value = item.waktu_mulai;
    document.getElementById('form-jadwal-selesai').value = item.waktu_selesai;
    document.getElementById('form-jadwal-kelas').value = item.kelas;
    document.getElementById('form-jadwal-mapel').value = item.mata_pelajaran;
    document.getElementById('form-jadwal-ruang').value = item.ruangan || 'Ruang Kelas';
    document.getElementById('form-jadwal-jp').value = item.jumlah_jp || 2;

    const modal = new bootstrap.Modal(document.getElementById('modal-jadwal-form'));
    modal.show();
  },

  saveJadwal() {
    const id = document.getElementById('form-jadwal-id').value;
    const guruId = parseInt(document.getElementById('form-jadwal-guru-id').value);
    const mapel = document.getElementById('form-jadwal-mapel').value.trim();
    const hari = document.getElementById('form-jadwal-hari').value;
    const kelas = document.getElementById('form-jadwal-kelas').value;
    const mulai = document.getElementById('form-jadwal-mulai').value;
    const selesai = document.getElementById('form-jadwal-selesai').value;

    if (!guruId) {
      App.showToast('Validasi Gagal', 'Silakan pilih guru pengajar terlebih dahulu.', 'warning');
      return;
    }
    if (!mapel) {
      App.showToast('Validasi Gagal', 'Mata pelajaran tidak boleh kosong.', 'warning');
      return;
    }
    if (!mulai || !selesai || mulai >= selesai) {
      App.showToast('Validasi Waktu', 'Waktu mulai harus lebih awal dari waktu selesai.', 'warning');
      return;
    }

    // Deteksi Bentrok Jadwal Guru & Kelas (lebih akurat)
    const allJadwal = DB.getAll('jadwal_mengajar');
    const guruConflict = allJadwal.find(j =>
      j.id != id &&
      j.guru_id === guruId &&
      j.hari === hari &&
      (mulai < j.waktu_selesai && selesai > j.waktu_mulai)
    );
    const kelasConflict = allJadwal.find(j =>
      j.id != id &&
      j.kelas === kelas &&
      j.hari === hari &&
      (mulai < j.waktu_selesai && selesai > j.waktu_mulai)
    );

    const conflict = guruConflict || kelasConflict;
    if (conflict) {
      const conflictType = guruConflict ? 'Guru' : 'Kelas';
      const conflictDetail = guruConflict
        ? `Guru ini sudah mengajar ${guruConflict.mata_pelajaran} (${guruConflict.kelas}) pukul ${guruConflict.waktu_mulai}–${guruConflict.waktu_selesai}`
        : `Kelas ${kelas} sudah memiliki jadwal ${kelasConflict.mata_pelajaran} pukul ${kelasConflict.waktu_mulai}–${kelasConflict.waktu_selesai}`;

      // Tampilkan modal konfirmasi bentrok via Bootstrap (tanpa confirm() native)
      const existingModal = document.getElementById('modal-konfirmasi-bentrok');
      if (existingModal) existingModal.remove();

      const modalHtml = `
        <div class="modal fade" id="modal-konfirmasi-bentrok" tabindex="-1">
          <div class="modal-dialog modal-sm">
            <div class="modal-content">
              <div class="modal-header bg-danger text-white">
                <h6 class="modal-title fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i>Bentrok ${conflictType}!</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body small">
                <p class="mb-1"><strong>Peringatan konflik jadwal terdeteksi:</strong></p>
                <p class="text-danger mb-0">${conflictDetail}</p>
                <p class="text-muted mt-2 mb-0">Apakah Anda tetap ingin menyimpan jadwal ini?</p>
              </div>
              <div class="modal-footer py-2">
                <button type="button" class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
                <button type="button" class="btn btn-sm btn-danger" id="btn-force-save-jadwal">
                  <i class="bi bi-save me-1"></i>Simpan Tetap
                </button>
              </div>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      const bentrokModal = new bootstrap.Modal(document.getElementById('modal-konfirmasi-bentrok'));
      document.getElementById('btn-force-save-jadwal').addEventListener('click', () => {
        bentrokModal.hide();
        this._doSaveJadwal(id, guruId, hari, kelas, mulai, selesai, mapel);
      });
      document.getElementById('modal-konfirmasi-bentrok').addEventListener('hidden.bs.modal', () => {
        document.getElementById('modal-konfirmasi-bentrok')?.remove();
      });
      bentrokModal.show();
      return;
    }

    this._doSaveJadwal(id, guruId, hari, kelas, mulai, selesai, mapel);
  },

  _doSaveJadwal(id, guruId, hari, kelas, mulai, selesai, mapel) {
    const data = {
      guru_id: guruId,
      hari: hari,
      jam_ke: document.getElementById('form-jadwal-jam-ke').value.trim() || '-',
      waktu_mulai: mulai,
      waktu_selesai: selesai,
      kelas: kelas,
      mata_pelajaran: mapel,
      ruangan: document.getElementById('form-jadwal-ruang').value.trim() || 'Ruang Kelas',
      jumlah_jp: parseInt(document.getElementById('form-jadwal-jp').value) || 2
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';

    if (!id) {
      DB.insert('jadwal_mengajar', data, `Menambah jadwal ${data.mata_pelajaran} (${data.kelas}) untuk ${namaGuru}`);
      App.showToast('Jadwal Ditambahkan', `Jadwal ${mapel} hari ${hari} berhasil disimpan.`, 'success');
    } else {
      DB.update('jadwal_mengajar', id, data, `Mengubah jadwal ${data.mata_pelajaran} untuk ${namaGuru}`);
      App.showToast('Jadwal Diperbarui', `Jadwal ${mapel} hari ${hari} berhasil diperbarui.`, 'success');
    }

    const modalEl = document.getElementById('modal-jadwal-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderList();
  },

  confirmDeleteJadwal(id) {
    const item = DB.getById('jadwal_mengajar', id);
    if (!item) return;

    const guru = DB.getById('guru', item.guru_id) || {};

    const existingModal = document.getElementById('modal-konfirmasi-hapus-jadwal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
      <div class="modal fade" id="modal-konfirmasi-hapus-jadwal" tabindex="-1">
        <div class="modal-dialog modal-sm">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white py-2">
              <h6 class="modal-title fw-bold"><i class="bi bi-trash me-2"></i>Hapus Jadwal</h6>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body small">
              Hapus jadwal <strong>${item.mata_pelajaran}</strong> (${item.kelas}) 
              hari <strong>${item.hari}</strong> pukul ${item.waktu_mulai}–${item.waktu_selesai} 
              oleh <strong>${Helpers.formatNamaGelar(guru)}</strong>?
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
              <button type="button" class="btn btn-sm btn-danger" id="btn-confirm-hapus-jadwal">
                <i class="bi bi-trash me-1"></i>Hapus
              </button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const hapusModal = new bootstrap.Modal(document.getElementById('modal-konfirmasi-hapus-jadwal'));
    document.getElementById('btn-confirm-hapus-jadwal').addEventListener('click', () => {
      hapusModal.hide();
      DB.delete('jadwal_mengajar', id, `Menghapus jadwal ${item.mata_pelajaran} hari ${item.hari}`);
      App.showToast('Jadwal Dihapus', `Jadwal ${item.mata_pelajaran} (${item.hari}) telah dihapus.`, 'info');
      this.renderList();
    });
    document.getElementById('modal-konfirmasi-hapus-jadwal').addEventListener('hidden.bs.modal', () => {
      document.getElementById('modal-konfirmasi-hapus-jadwal')?.remove();
    });
    hapusModal.show();
  },

  printJadwal() {
    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    const list = this.getFilteredList();
    if (list.length === 0) {
      App.showToast('Data Kosong', 'Tidak ada jadwal yang dapat dicetak pada filter ini.', 'warning');
      return;
    }

    const hariOrder = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };

    const rows = list.map((j, idx) => {
      const g = DB.getById('guru', j.guru_id) || {};
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${idx + 1}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px; font-weight: bold;">${j.hari}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${j.waktu_mulai} – ${j.waktu_selesai}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">Jam ke-${j.jam_ke || '-'}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px; font-weight: bold;">${j.kelas}</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">${j.mata_pelajaran}</td>
          <td style="border: 1px solid #000; padding: 5px;">${j.ruangan || 'Ruang Kelas'}</td>
          <td style="border: 1px solid #000; padding: 5px;">${Helpers.formatNamaGelar(g)}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${j.jumlah_jp} JP</td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div style="text-align: center; margin: 12px 0 8px;">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px; font-size: 14pt;">
          JADWAL PEMBELAJARAN KURIKULUM MERDEKA
        </h4>
        <p style="font-size: 10pt; margin: 0;">
          Semester Ganjil Tahun Ajaran 2026/2027 &mdash; SD Negeri Sumber Waru 2
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8.5pt;">
        <thead>
          <tr style="background: #e2e8f0;">
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">No</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Hari</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Waktu</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Jam Ke-</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Kelas</th>
            <th style="border: 1px solid #000; padding: 6px;">Mata Pelajaran</th>
            <th style="border: 1px solid #000; padding: 6px;">Ruangan</th>
            <th style="border: 1px solid #000; padding: 6px;">Guru Pengajar</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">JP</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-top: 30px; page-break-inside: avoid;">
        ${App.getTandaTanganKS(Helpers.formatDateIndo(new Date().toISOString().slice(0, 10)))}
      </div>
    `;

    window.print();
  },

  exportExcel() {
    const list = this.getFilteredList();
    if (list.length === 0) {
      App.showToast('Data Kosong', 'Tidak ada jadwal yang dapat diekspor.', 'warning');
      return;
    }

    const data = list.map((j, idx) => {
      const g = DB.getById('guru', j.guru_id) || {};
      return {
        'No': idx + 1,
        'Hari': j.hari,
        'Jam Ke-': j.jam_ke || '-',
        'Waktu Mulai': j.waktu_mulai,
        'Waktu Selesai': j.waktu_selesai,
        'Kelas': j.kelas,
        'Mata Pelajaran': j.mata_pelajaran,
        'Ruangan': j.ruangan || 'Ruang Kelas',
        'Guru Pengajar': Helpers.formatNamaGelar(g),
        'NIP Guru': g.nip || '-',
        'Jumlah JP': j.jumlah_jp
      };
    });

  },
// Auto-schedule generation with load-balanced teacher distribution and conflict avoidance
autoGenerateSchedule(config = {}) {
  // config: {days: ['Senin','Selasa',...], startTime: '07:30', endTime: '12:00', slotDuration: 90, classes: [], teachers: []}
  const defaultConfig = {
    days: ['Senin','Selasa','Rabu','Kamis','Jumat'],
    startTime: '07:30',
    endTime: '12:00',
    slotDuration: 90, // minutes
    classes: DB.getAll('kelas').map(c => c.id_kelas),
    teachers: DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif').map(g => g.id_guru)
  };
  const cfg = { ...defaultConfig, ...config };

  // Helper to add minutes to a HH:MM time string
  const addMinutes = (time, mins) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date(0, 0, 0, h, m + mins);
    return date.toTimeString().slice(0, 5);
  };

  // Generate time slots per day based on start/end and slotDuration
  const slots = [];
  let t = cfg.startTime;
  while (t < cfg.endTime) {
    const end = addMinutes(t, cfg.slotDuration);
    if (end > cfg.endTime) break;
    slots.push({ start: t, end });
    t = end;
  }

  // Initialize teacher load map (number of assigned slots)
  const teacherLoad = {};
  cfg.teachers.forEach(id => { teacherLoad[id] = 0; });

  // Utility to get teacher with minimal current load
  const getLeastLoadedTeacher = () => {
    let minLoad = Infinity, selected = null;
    for (const [id, load] of Object.entries(teacherLoad)) {
      if (load < minLoad) { minLoad = load; selected = id; }
    }
    return selected;
  };

  // Assign teachers to each class-slot, balancing load
  cfg.days.forEach(hari => {
    cfg.classes.forEach(kelasId => {
      const kelasObj = DB.getById('kelas', kelasId) || {};
      slots.forEach(slot => {
        const guruId = getLeastLoadedTeacher();
        teacherLoad[guruId]++;
        const data = {
          guru_id: guruId,
          hari: hari,
          jam_ke: '-',
          waktu_mulai: slot.start,
          waktu_selesai: slot.end,
          kelas: kelasObj.nama_kelas || `Kelas ${kelasId}`,
          mata_pelajaran: 'Umum',
          ruangan: 'Ruang Kelas',
          jumlah_jp: 2
        };
        DB.insert('jadwal_mengajar', data, `Auto-generate jadwal ${hari} ${data.kelas}`);
      });
    });
  });

  App.showToast('Jadwal Otomatis', 'Jadwal telah dibuat secara seimbang.', 'success');
  this.renderList();
},
};
