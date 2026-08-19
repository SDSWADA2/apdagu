/**
 * ============================================================================
 * MODUL ABSENSI & PRESENSI HARIAN GURU (DISEMPURNAKAN)
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const AbsensiModule = {
  selectedDate: new Date().toISOString().slice(0, 10),
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  filterStatus: 'all',
  searchQuery: '',
  currentEditingId: null,
  liveClockInterval: null,
  charts: {
    status: null,
    monthly: null
  },

  init() {
    this.ensureDefaultSettings();
    this.ensureSeedDataForMonth();
    this.bindEvents();
    this.renderDatePicker();
    this.renderGuruSelect();
    this.renderList();
    this.renderSummary();
    this.startLiveClock();
  },

  ensureDefaultSettings() {
    if (!DB.state.pengaturan_absensi) {
      DB.state.pengaturan_absensi = {
        jam_masuk: '07:00',
        jam_toleransi: '07:15',
        jam_pulang_reguler: '14:30',
        jam_pulang_jumat: '11:30',
        jam_pulang_sabtu: '13:00',
        hari_kerja: 6
      };
      DB.saveState();
    }
  },

  /**
   * Mengisi data absensi realistis jika data di bulan terpilih masih kosong
   */
  ensureSeedDataForMonth() {
    const absensiList = DB.getAll('absensi');
    const guruList = DB.getAll('guru');
    if (guruList.length === 0) return;

    // Cek apakah tanggal hari ini sudah memiliki data
    const today = this.selectedDate;
    const todayRecords = absensiList.filter(a => a.tanggal === today);
    if (todayRecords.length === 0) {
      // Seed default untuk hari ini
      guruList.forEach((g, idx) => {
        let status = 'Hadir';
        let masuk = '06:45';
        let ket = 'Tepat waktu';
        if (idx === 4) {
          masuk = '07:20';
          status = 'Terlambat';
          ket = 'Kendala lalu lintas';
        } else if (idx === 7) {
          masuk = '07:05';
          ket = 'Tepat waktu';
        }
        DB.insert('absensi', {
          guru_id: g.id,
          tanggal: today,
          waktu_masuk: masuk,
          waktu_pulang: '14:30',
          status_kehadiran: status,
          keterangan: ket,
          nomor_surat: ''
        });
      });
    }
  },

  bindEvents() {
    // Filter tanggal harian
    const dateInput = document.getElementById('filter-absensi-tanggal');
    if (dateInput) {
      dateInput.value = this.selectedDate;
      dateInput.addEventListener('change', (e) => {
        this.selectedDate = e.target.value;
        this.updateDateLabel();
        this.renderList();
        this.renderSummary();
      });
    }

    // Filter status
    const statusFilter = document.getElementById('filter-absensi-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.renderList();
      });
    }

    // Form submit
    const form = document.getElementById('form-absensi');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveAbsensi();
      });
    }

    this.updateDateLabel();
  },

  updateDateLabel() {
    const labelEl = document.getElementById('absensi-hari-label');
    if (!labelEl) return;
    const date = new Date(this.selectedDate);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = dayNames[date.getDay()];
    labelEl.textContent = `${dayName}, ${Helpers.formatDateIndo(this.selectedDate)}`;
    if (date.getDay() === 0) {
      labelEl.className = 'badge bg-danger text-white border px-2 py-1 small';
    } else {
      labelEl.className = 'badge bg-primary-subtle text-primary border px-2 py-1 small fw-bold';
    }
  },

  navigateDate(offset) {
    const cur = new Date(this.selectedDate);
    cur.setDate(cur.getDate() + offset);
    this.selectedDate = cur.toISOString().slice(0, 10);
    const dateInput = document.getElementById('filter-absensi-tanggal');
    if (dateInput) dateInput.value = this.selectedDate;
    this.updateDateLabel();
    this.renderList();
    this.renderSummary();
  },

  setTodayDate() {
    this.selectedDate = new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById('filter-absensi-tanggal');
    if (dateInput) dateInput.value = this.selectedDate;
    this.updateDateLabel();
    this.renderList();
    this.renderSummary();
  },

  renderDatePicker() {
    const dateInput = document.getElementById('filter-absensi-tanggal');
    if (dateInput) dateInput.value = this.selectedDate;
    
    // Set default month & year in matrix filter
    const monthSelect = document.getElementById('filter-matrix-bulan');
    const yearSelect = document.getElementById('filter-matrix-tahun');
    if (monthSelect) monthSelect.value = this.selectedMonth;
    if (yearSelect) yearSelect.value = this.selectedYear;

    // Load settings into form
    const settings = DB.state.pengaturan_absensi || {};
    if (document.getElementById('setting-jam-masuk')) document.getElementById('setting-jam-masuk').value = settings.jam_masuk || '07:00';
    if (document.getElementById('setting-jam-toleransi')) document.getElementById('setting-jam-toleransi').value = settings.jam_toleransi || '07:15';
    if (document.getElementById('setting-jam-pulang-reguler')) document.getElementById('setting-jam-pulang-reguler').value = settings.jam_pulang_reguler || '14:30';
    if (document.getElementById('setting-jam-pulang-jumat')) document.getElementById('setting-jam-pulang-jumat').value = settings.jam_pulang_jumat || '11:30';
    if (document.getElementById('setting-jam-pulang-sabtu')) document.getElementById('setting-jam-pulang-sabtu').value = settings.jam_pulang_sabtu || '13:00';
  },

  renderGuruSelect() {
    const formSelect = document.getElementById('form-absensi-guru-id');
    const mandiriSelect = document.getElementById('mandiri-guru-select');
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');

    const options = `<option value="">-- Pilih Guru / PTK --</option>` + 
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)} (${g.nuptk || g.nip || 'NIP -'})</option>`).join('');

    if (formSelect) formSelect.innerHTML = options;
    if (mandiriSelect) {
      mandiriSelect.innerHTML = options;
      if (guruList.length > 0) {
        mandiriSelect.value = guruList[0].id;
        this.loadMandiriGuruState();
      }
    }
  },

  renderList() {
    const tbody = document.getElementById('absensi-table-body');
    if (!tbody) return;

    let guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const absensiList = DB.getAll('absensi').filter(a => a.tanggal === this.selectedDate);
    const settings = DB.state.pengaturan_absensi || { jam_toleransi: '07:15' };

    // Apply Filter Status
    if (this.filterStatus !== 'all') {
      guruList = guruList.filter(g => {
        const record = absensiList.find(a => a.guru_id === g.id);
        const st = record ? record.status_kehadiran : 'Belum Absen';
        if (this.filterStatus === 'Terlambat') {
          return st === 'Terlambat' || (st === 'Hadir' && record && record.waktu_masuk > settings.jam_toleransi);
        }
        if (this.filterStatus === 'Belum Absen') {
          return !record;
        }
        return st === this.filterStatus;
      });
    }

    if (guruList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-person-x fs-1 d-block mb-1"></i>
            Tidak ada data guru yang sesuai dengan filter presensi.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = guruList.map((g, idx) => {
      const record = absensiList.find(a => a.guru_id === g.id);
      const rawStatus = record ? record.status_kehadiran : 'Belum Absen';
      const masuk = record ? record.waktu_masuk || '-' : '-';
      const pulang = record ? record.waktu_pulang || '-' : '-';
      const ket = record ? record.keterangan || '-' : '-';
      const surat = record && record.nomor_surat ? `<span class="badge bg-light text-dark border ms-1"><i class="bi bi-file-text me-1"></i>${record.nomor_surat}</span>` : '';

      // Evaluasi Keterlambatan
      let isLate = false;
      let lateMinutes = 0;
      if (record && (rawStatus === 'Hadir' || rawStatus === 'Terlambat') && record.waktu_masuk) {
        lateMinutes = Helpers.calculateLateness(record.waktu_masuk, settings.jam_toleransi);
        if (lateMinutes > 0 || rawStatus === 'Terlambat') {
          isLate = true;
        }
      }

      // Badge status HTML
      let badgeHtml = '';
      if (rawStatus === 'Hadir' && !isLate) {
        badgeHtml = '<span class="badge-custom badge-hadir"><i class="bi bi-check-circle-fill"></i>Hadir</span>';
      } else if (rawStatus === 'Terlambat' || isLate) {
        badgeHtml = `<span class="badge-custom badge-terlambat"><i class="bi bi-clock-history"></i>Terlambat ${lateMinutes > 0 ? `(${lateMinutes}m)` : ''}</span>`;
      } else if (rawStatus === 'Izin') {
        badgeHtml = '<span class="badge-custom badge-izin"><i class="bi bi-info-circle-fill"></i>Izin</span>';
      } else if (rawStatus === 'Sakit') {
        badgeHtml = '<span class="badge-custom badge-sakit"><i class="bi bi-heart-pulse-fill"></i>Sakit</span>';
      } else if (rawStatus === 'Dinas Luar') {
        badgeHtml = '<span class="badge-custom badge-dinas"><i class="bi bi-briefcase-fill"></i>Dinas Luar</span>';
      } else if (rawStatus === 'Cuti') {
        badgeHtml = '<span class="badge-custom badge-cuti"><i class="bi bi-calendar-event-fill"></i>Cuti</span>';
      } else if (rawStatus === 'Alpha') {
        badgeHtml = '<span class="badge-custom badge-alpha"><i class="bi bi-x-circle-fill"></i>Alpha</span>';
      } else {
        badgeHtml = '<span class="badge-custom badge-belum"><i class="bi bi-dash-circle"></i>Belum Absen</span>';
      }

      const activeClass = (st) => (rawStatus === st || (st === 'Hadir' && rawStatus === 'Hadir' && !isLate)) ? 'active' : '';

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <img src="${g.foto_url || generateAvatar(g.nama_lengkap)}" alt="${g.nama_lengkap}" class="avatar-teacher">
              <div>
                <div class="fw-bold text-dark">${Helpers.formatNamaGelar(g)}</div>
                <small class="text-muted">NUPTK: ${g.nuptk || '-'} | NIP: ${g.nip || '-'}</small>
              </div>
            </div>
          </td>
          <td>${badgeHtml}</td>
          <td>
            <strong class="${isLate ? 'text-warning' : 'text-dark'}">${masuk}</strong>
            ${isLate ? '<small class="d-block text-warning" style="font-size:10px;">Telat</small>' : ''}
          </td>
          <td><strong>${pulang}</strong></td>
          <td>
            <div class="small text-truncate" style="max-width: 180px;" title="${ket}">${ket}</div>
            ${surat}
          </td>
          <td class="text-center">
            <div class="d-flex align-items-center justify-content-center gap-1">
              <!-- Inline Quick Buttons -->
              <div class="btn-quick-group" title="Ubah status cepat">
                <button class="btn-quick-status btn-q-h ${activeClass('Hadir')}" onclick="AbsensiModule.quickSetStatus(${g.id}, 'Hadir')" title="Hadir">H</button>
                <button class="btn-quick-status btn-q-i ${activeClass('Izin')}" onclick="AbsensiModule.quickSetStatus(${g.id}, 'Izin')" title="Izin">I</button>
                <button class="btn-quick-status btn-q-s ${activeClass('Sakit')}" onclick="AbsensiModule.quickSetStatus(${g.id}, 'Sakit')" title="Sakit">S</button>
                <button class="btn-quick-status btn-q-d ${activeClass('Dinas Luar')}" onclick="AbsensiModule.quickSetStatus(${g.id}, 'Dinas Luar')" title="Dinas Luar">D</button>
                <button class="btn-quick-status btn-q-c ${activeClass('Cuti')}" onclick="AbsensiModule.quickSetStatus(${g.id}, 'Cuti')" title="Cuti">C</button>
                <button class="btn-quick-status btn-q-a ${activeClass('Alpha')}" onclick="AbsensiModule.quickSetStatus(${g.id}, 'Alpha')" title="Alpha">A</button>
              </div>
              <button class="btn btn-sm btn-outline-primary p-1" onclick="AbsensiModule.openDetailAbsen(${g.id})" title="Edit Detail Presensi">
                <i class="bi bi-pencil-square"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderSummary() {
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const absensiList = DB.getAll('absensi').filter(a => a.tanggal === this.selectedDate);
    const settings = DB.state.pengaturan_absensi || { jam_toleransi: '07:15' };

    let hadirCount = 0;
    let terlambatCount = 0;
    let izinSakitCount = 0;
    let dinasCutiCount = 0;
    let alphaCount = 0;

    guruList.forEach(g => {
      const record = absensiList.find(a => a.guru_id === g.id);
      if (!record) {
        alphaCount++;
      } else {
        const st = record.status_kehadiran;
        if (st === 'Hadir') {
          if (record.waktu_masuk && record.waktu_masuk > settings.jam_toleransi) {
            terlambatCount++;
          } else {
            hadirCount++;
          }
        } else if (st === 'Terlambat') {
          terlambatCount++;
        } else if (st === 'Izin' || st === 'Sakit') {
          izinSakitCount++;
        } else if (st === 'Dinas Luar' || st === 'Cuti') {
          dinasCutiCount++;
        } else if (st === 'Alpha') {
          alphaCount++;
        }
      }
    });

    const totalGuru = guruList.length || 1;
    const totalHadirFisik = hadirCount + terlambatCount + dinasCutiCount;
    const persentase = Math.round((totalHadirFisik / totalGuru) * 100);

    const update = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    update('absensi-total-hadir', hadirCount);
    update('absensi-total-terlambat', terlambatCount);
    update('absensi-total-izin-sakit', izinSakitCount);
    update('absensi-total-dinas-cuti', dinasCutiCount);
    update('absensi-total-alpha', alphaCount);
    update('absensi-total-persentase', `${persentase}%`);
  },

  /**
   * Set status kehadiran 1-klik dari baris tabel
   */
  quickSetStatus(guruId, status) {
    const guru = DB.getById('guru', guruId);
    if (!guru) return;

    const existing = DB.getAll('absensi').find(a => a.guru_id === guruId && a.tanggal === this.selectedDate);
    const settings = DB.state.pengaturan_absensi || { jam_masuk: '06:45', jam_pulang_reguler: '14:30' };

    let waktuMasuk = settings.jam_masuk || '06:45';
    let waktuPulang = settings.jam_pulang_reguler || '14:30';
    let ket = 'Presensi cepat';

    if (status === 'Terlambat') {
      waktuMasuk = '07:25';
      ket = 'Terlambat hadir';
    } else if (status === 'Izin') {
      waktuMasuk = '-';
      waktuPulang = '-';
      ket = 'Izin keperluan dinas/keluarga';
    } else if (status === 'Sakit') {
      waktuMasuk = '-';
      waktuPulang = '-';
      ket = 'Sakit (Keterangan dokter)';
    } else if (status === 'Dinas Luar') {
      waktuMasuk = '-';
      waktuPulang = '-';
      ket = 'Tugas luar / Diklat / KKG';
    } else if (status === 'Cuti') {
      waktuMasuk = '-';
      waktuPulang = '-';
      ket = 'Cuti resmi';
    } else if (status === 'Alpha') {
      waktuMasuk = '-';
      waktuPulang = '-';
      ket = 'Tanpa keterangan';
    }

    const data = {
      guru_id: guruId,
      tanggal: this.selectedDate,
      status_kehadiran: status,
      waktu_masuk: waktuMasuk,
      waktu_pulang: waktuPulang,
      keterangan: ket,
      nomor_surat: existing ? existing.nomor_surat || '' : ''
    };

    const nama = Helpers.formatNamaGelar(guru);

    if (existing) {
      DB.update('absensi', existing.id, data, `Update presensi cepat (${status}) untuk ${nama}`);
    } else {
      DB.insert('absensi', data, `Presensi cepat (${status}) untuk ${nama}`);
    }

    App.showToast('Presensi Diperbarui', `${nama} ditandai [${status}].`, 'success');
    this.renderList();
    this.renderSummary();
  },

  openDetailAbsen(guruId) {
    const guru = DB.getById('guru', guruId);
    if (!guru) return;

    this.currentEditingId = guruId;
    document.getElementById('modal-absensi-title').innerHTML = `<i class="bi bi-pencil-square text-primary me-2"></i>Presensi: ${Helpers.formatNamaGelar(guru)}`;
    document.getElementById('form-absensi-guru-id').value = guru.id;
    document.getElementById('form-absensi-tanggal').value = this.selectedDate;
    
    const existing = DB.getAll('absensi').find(a => a.guru_id === guru.id && a.tanggal === this.selectedDate);
    const deleteBtn = document.getElementById('btn-delete-absensi');
    
    if (existing) {
      document.getElementById('form-absensi-id').value = existing.id;
      document.getElementById('form-absensi-status').value = existing.status_kehadiran || 'Hadir';
      document.getElementById('form-absensi-masuk').value = existing.waktu_masuk !== '-' ? existing.waktu_masuk || '06:45' : '06:45';
      document.getElementById('form-absensi-pulang').value = existing.waktu_pulang !== '-' ? existing.waktu_pulang || '14:30' : '14:30';
      document.getElementById('form-absensi-ket').value = existing.keterangan || '';
      document.getElementById('form-absensi-surat').value = existing.nomor_surat || '';
      if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    } else {
      document.getElementById('form-absensi-id').value = '';
      document.getElementById('form-absensi-status').value = 'Hadir';
      document.getElementById('form-absensi-masuk').value = '06:45';
      document.getElementById('form-absensi-pulang').value = '14:30';
      document.getElementById('form-absensi-ket').value = 'Hadir Tepat Waktu';
      document.getElementById('form-absensi-surat').value = '';
      if (deleteBtn) deleteBtn.style.display = 'none';
    }

    this.handleFormStatusChange(document.getElementById('form-absensi-status').value);

    const modal = new bootstrap.Modal(document.getElementById('modal-absensi-form'));
    modal.show();
  },

  handleFormStatusChange(status) {
    const timeRow = document.getElementById('form-absensi-time-row');
    const docGroup = document.getElementById('form-absensi-doc-group');
    if (status === 'Izin' || status === 'Sakit' || status === 'Dinas Luar' || status === 'Cuti' || status === 'Alpha') {
      if (timeRow) timeRow.style.opacity = '0.5';
      if (docGroup) docGroup.style.display = 'block';
    } else {
      if (timeRow) timeRow.style.opacity = '1';
    }
  },

  saveAbsensi() {
    const guruId = parseInt(document.getElementById('form-absensi-guru-id').value);
    const tanggal = document.getElementById('form-absensi-tanggal').value;
    const status = document.getElementById('form-absensi-status').value;
    const existingId = document.getElementById('form-absensi-id').value;

    if (!guruId || !tanggal) {
      App.showToast('Peringatan', 'Pilih guru dan tanggal presensi!', 'warning');
      return;
    }

    const masuk = (status === 'Izin' || status === 'Sakit' || status === 'Dinas Luar' || status === 'Cuti' || status === 'Alpha') ? '-' : (document.getElementById('form-absensi-masuk').value || '06:45');
    const pulang = (status === 'Izin' || status === 'Sakit' || status === 'Dinas Luar' || status === 'Cuti' || status === 'Alpha') ? '-' : (document.getElementById('form-absensi-pulang').value || '14:30');

    const data = {
      guru_id: guruId,
      tanggal: tanggal,
      status_kehadiran: status,
      waktu_masuk: masuk,
      waktu_pulang: pulang,
      keterangan: document.getElementById('form-absensi-ket').value.trim(),
      nomor_surat: document.getElementById('form-absensi-surat').value.trim()
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';

    if (existingId) {
      DB.update('absensi', existingId, data, `Update presensi (${status}) untuk ${namaGuru}`);
    } else {
      const existing = DB.getAll('absensi').find(a => a.guru_id === guruId && a.tanggal === tanggal);
      if (existing) {
        DB.update('absensi', existing.id, data, `Update presensi (${status}) untuk ${namaGuru}`);
      } else {
        DB.insert('absensi', data, `Catat presensi (${status}) untuk ${namaGuru}`);
      }
    }

    App.showToast('Presensi Berhasil', `Data kehadiran ${namaGuru} telah disimpan.`, 'success');

    const modalEl = document.getElementById('modal-absensi-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderList();
    this.renderSummary();
  },

  deleteCurrentAbsensi() {
    const existingId = document.getElementById('form-absensi-id').value;
    if (!existingId) return;

    App.showConfirm('Hapus Presensi', 'Hapus catatan presensi ini?', () => {
      DB.delete('absensi', existingId, 'Hapus catatan presensi guru');
      App.showToast('Presensi Dihapus', 'Catatan presensi guru telah dihapus.', 'info');

      const modalEl = document.getElementById('modal-absensi-form');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      this.renderList();
      this.renderSummary();
    });
  },

  // =========================================================================
  // BATCH ATTENDANCE ("TANDAI SEMUA HADIR")
  // =========================================================================
  openBatchModal() {
    document.getElementById('batch-absensi-tanggal').value = this.selectedDate;
    const settings = DB.state.pengaturan_absensi || {};
    document.getElementById('batch-absensi-masuk').value = settings.jam_masuk || '06:45';
    document.getElementById('batch-absensi-pulang').value = settings.jam_pulang_reguler || '14:30';

    const modal = new bootstrap.Modal(document.getElementById('modal-absensi-batch'));
    modal.show();
  },

  executeBatchHadir() {
    const tanggal = document.getElementById('batch-absensi-tanggal').value;
    const masuk = document.getElementById('batch-absensi-masuk').value || '06:45';
    const pulang = document.getElementById('batch-absensi-pulang').value || '14:30';
    const overwrite = document.getElementById('batch-overwrite-existing').checked;

    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const absensiList = DB.getAll('absensi');

    let count = 0;
    guruList.forEach(g => {
      const existing = absensiList.find(a => a.guru_id === g.id && a.tanggal === tanggal);
      if (!existing) {
        DB.insert('absensi', {
          guru_id: g.id,
          tanggal: tanggal,
          status_kehadiran: 'Hadir',
          waktu_masuk: masuk,
          waktu_pulang: pulang,
          keterangan: 'Hadir Tepat Waktu (Batch)',
          nomor_surat: ''
        });
        count++;
      } else if (overwrite) {
        DB.update('absensi', existing.id, {
          status_kehadiran: 'Hadir',
          waktu_masuk: masuk,
          waktu_pulang: pulang,
          keterangan: 'Hadir Tepat Waktu (Batch)',
          nomor_surat: ''
        });
        count++;
      }
    });

    App.showToast('Batch Presensi Selesai', `${count} guru berhasil ditandai Hadir pada ${Helpers.formatDateIndo(tanggal)}.`, 'success');

    const modalEl = document.getElementById('modal-absensi-batch');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderList();
    this.renderSummary();
  },

  // =========================================================================
  // PRESENSI MANDIRI / DIGITAL KIOSK LIVE CLOCK
  // =========================================================================
  startLiveClock() {
    if (this.liveClockInterval) clearInterval(this.liveClockInterval);
    const update = () => {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

      const timeEl = document.getElementById('live-clock-time');
      const dateEl = document.getElementById('live-clock-date');
      if (timeEl) timeEl.textContent = timeStr;
      if (dateEl) dateEl.textContent = dateStr;
    };
    update();
    this.liveClockInterval = setInterval(update, 1000);
  },

  openMandiriModal() {
    this.renderGuruSelect();
    const today = new Date().toISOString().slice(0, 10);
    ExportUtils.renderQRCode('qrcode-presensi-container', `SDN_SUMBER_WARU_2_PRESENSI_${today}`, 120);

    const modal = new bootstrap.Modal(document.getElementById('modal-absensi-mandiri'));
    modal.show();
    this.loadMandiriGuruState();
  },

  loadMandiriGuruState() {
    const select = document.getElementById('mandiri-guru-select');
    const infoEl = document.getElementById('mandiri-status-info');
    const btnMasuk = document.getElementById('btn-mandiri-masuk');
    const btnPulang = document.getElementById('btn-mandiri-pulang');
    if (!select || !infoEl) return;

    const guruId = parseInt(select.value);
    if (!guruId) {
      infoEl.className = 'alert alert-info py-2 small mb-3';
      infoEl.innerHTML = `<i class="bi bi-info-circle me-1"></i>Pilih nama guru terlebih dahulu.`;
      if (btnMasuk) btnMasuk.disabled = true;
      if (btnPulang) btnPulang.disabled = true;
      return;
    }

    if (btnMasuk) btnMasuk.disabled = false;
    if (btnPulang) btnPulang.disabled = false;

    const today = new Date().toISOString().slice(0, 10);
    const existing = DB.getAll('absensi').find(a => a.guru_id === guruId && a.tanggal === today);

    if (existing) {
      infoEl.className = 'alert alert-success py-2 small mb-3';
      infoEl.innerHTML = `
        <div class="fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Status Hari Ini: ${existing.status_kehadiran}</div>
        <div>Masuk: <strong>${existing.waktu_masuk || '-'}</strong> | Pulang: <strong>${existing.waktu_pulang || '-'}</strong></div>
      `;
    } else {
      infoEl.className = 'alert alert-warning py-2 small mb-3';
      infoEl.innerHTML = `<i class="bi bi-clock-history me-1"></i>Belum melakukan presensi hari ini. Silakan klik tombol <strong>Absen Masuk</strong>.`;
    }
  },

  doMandiriAbsen(type) {
    const select = document.getElementById('mandiri-guru-select');
    const guruId = parseInt(select.value);
    if (!guruId) {
      App.showToast('Peringatan', 'Pilih nama guru terlebih dahulu!', 'warning');
      return;
    }

    const guru = DB.getById('guru', guruId);
    const nama = guru ? Helpers.formatNamaGelar(guru) : 'Guru';
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 5);
    const ket = document.getElementById('mandiri-keterangan').value.trim() || 'Presensi Mandiri Digital';
    const settings = DB.state.pengaturan_absensi || { jam_toleransi: '07:15' };

    const existing = DB.getAll('absensi').find(a => a.guru_id === guruId && a.tanggal === today);

    if (type === 'masuk') {
      const isLate = nowTime > settings.jam_toleransi;
      const status = isLate ? 'Terlambat' : 'Hadir';
      const data = {
        guru_id: guruId,
        tanggal: today,
        status_kehadiran: status,
        waktu_masuk: nowTime,
        waktu_pulang: existing ? existing.waktu_pulang : '-',
        keterangan: isLate ? `${ket} (Terlambat)` : ket,
        nomor_surat: ''
      };

      if (existing) {
        DB.update('absensi', existing.id, data, `Presensi masuk mandiri ${nama}`);
      } else {
        DB.insert('absensi', data, `Presensi masuk mandiri ${nama}`);
      }
      App.showToast('Presensi Masuk Berhasil', `${nama} berhasil absen masuk pukul ${nowTime} WIB.`, 'success');
    } else {
      if (!existing) {
        DB.insert('absensi', {
          guru_id: guruId,
          tanggal: today,
          status_kehadiran: 'Hadir',
          waktu_masuk: '07:00',
          waktu_pulang: nowTime,
          keterangan: ket,
          nomor_surat: ''
        }, `Presensi pulang mandiri ${nama}`);
      } else {
        DB.update('absensi', existing.id, {
          waktu_pulang: nowTime
        }, `Presensi pulang mandiri ${nama}`);
      }
      App.showToast('Presensi Pulang Berhasil', `${nama} berhasil absen pulang pukul ${nowTime} WIB.`, 'success');
    }

    this.loadMandiriGuruState();
    this.renderList();
    this.renderSummary();
  },

  // =========================================================================
  // REKAPITULASI BULANAN MATRIX (1 BULAN KALENDER)
  // =========================================================================
  renderMonthlyMatrix() {
    const monthSelect = document.getElementById('filter-matrix-bulan');
    const yearSelect = document.getElementById('filter-matrix-tahun');
    const statusGuruSelect = document.getElementById('filter-matrix-status-guru');

    const month = monthSelect ? parseInt(monthSelect.value) : this.selectedMonth;
    const year = yearSelect ? parseInt(yearSelect.value) : this.selectedYear;
    const filterGuru = statusGuruSelect ? statusGuruSelect.value : 'all';

    const daysInMonth = Helpers.getDaysInMonth(year, month);
    const thead = document.getElementById('matrix-head');
    const tbody = document.getElementById('matrix-body');
    if (!thead || !tbody) return;

    // Filter guru list
    let guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const kepegawaianList = DB.getAll('kepegawaian');

    if (filterGuru !== 'all') {
      guruList = guruList.filter(g => {
        const kep = kepegawaianList.find(k => k.guru_id === g.id);
        return kep && kep.status_kepegawaian === filterGuru;
      });
    }

    // Build Thead Header (Day 1..N)
    let thDays = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const isSun = Helpers.isSunday(year, month, d);
      const dayShort = Helpers.getDayNameShort(year, month, d);
      thDays += `
        <th class="${isSun ? 'cell-sunday' : ''}" style="width: 26px; min-width: 26px; padding: 4px 1px;">
          <div style="font-size: 9px;">${dayShort}</div>
          <div class="fw-bold">${d}</div>
        </th>
      `;
    }

    thead.innerHTML = `
      <tr>
        <th class="sticky-col-no" rowspan="2">No</th>
        <th class="sticky-col-name" rowspan="2">Nama Guru & PTK</th>
        <th colspan="${daysInMonth}" class="text-center bg-primary text-white py-1">Tanggal & Hari (${monthSelect ? monthSelect.options[monthSelect.selectedIndex].text : ''} ${year})</th>
        <th colspan="7" class="text-center bg-dark text-white py-1">Akumulasi Kehadiran</th>
      </tr>
      <tr>
        ${thDays}
        <th class="bg-success text-white" style="width: 32px;" title="Hadir">H</th>
        <th class="bg-warning text-dark" style="width: 32px;" title="Terlambat">T</th>
        <th class="bg-info text-white" style="width: 32px;" title="Izin">I</th>
        <th class="bg-warning" style="width: 32px;" title="Sakit">S</th>
        <th style="background:#8b5cf6; color:#fff; width: 32px;" title="Dinas Luar">D</th>
        <th class="bg-danger text-white" style="width: 32px;" title="Alpha">A</th>
        <th class="bg-primary text-white" style="width: 45px;" title="Persentase">%</th>
      </tr>
    `;

    // Fetch all absensi in this month
    const absensiAll = DB.getAll('absensi');
    const monthStr = String(month).padStart(2, '0');

    // Build Table Body Rows
    tbody.innerHTML = guruList.map((g, idx) => {
      let hCount = 0, tCount = 0, iCount = 0, sCount = 0, dCount = 0, aCount = 0, cCount = 0;
      let dayCells = '';
      let effectiveWorkingDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const isSun = Helpers.isSunday(year, month, d);
        if (!isSun) effectiveWorkingDays++;

        const dayDateStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
        const record = absensiAll.find(a => a.guru_id === g.id && a.tanggal === dayDateStr);

        if (isSun) {
          dayCells += `<td class="cell-sunday cell-l" title="Hari Minggu / Libur">L</td>`;
        } else if (record) {
          const st = record.status_kehadiran;
          if (st === 'Hadir') {
            hCount++;
            dayCells += `<td class="cell-h" title="Hadir (${record.waktu_masuk || '-'})">H</td>`;
          } else if (st === 'Terlambat') {
            tCount++;
            dayCells += `<td class="cell-t" title="Terlambat (${record.waktu_masuk || '-'})">T</td>`;
          } else if (st === 'Izin') {
            iCount++;
            dayCells += `<td class="cell-i" title="Izin">I</td>`;
          } else if (st === 'Sakit') {
            sCount++;
            dayCells += `<td class="cell-s" title="Sakit">S</td>`;
          } else if (st === 'Dinas Luar') {
            dCount++;
            dayCells += `<td class="cell-d" title="Dinas Luar">D</td>`;
          } else if (st === 'Cuti') {
            cCount++;
            dayCells += `<td class="cell-c" title="Cuti">C</td>`;
          } else if (st === 'Alpha') {
            aCount++;
            dayCells += `<td class="cell-a" title="Alpha">A</td>`;
          }
        } else {
          // Check if date is in past or future
          const todayStr = new Date().toISOString().slice(0, 10);
          if (dayDateStr <= todayStr) {
            aCount++;
            dayCells += `<td class="cell-a" title="Tanpa Keterangan">A</td>`;
          } else {
            dayCells += `<td class="cell-empty" title="Belum terlaksana">-</td>`;
          }
        }
      }

      const totalHadirFisik = hCount + tCount + dCount;
      const pct = effectiveWorkingDays > 0 ? Math.min(100, Math.round((totalHadirFisik / effectiveWorkingDays) * 100)) : 100;

      return `
        <tr>
          <td class="sticky-col-no fw-bold text-muted">${idx + 1}</td>
          <td class="sticky-col-name">
            <div class="fw-bold text-dark text-truncate" style="max-width: 200px;">${Helpers.formatNamaGelar(g)}</div>
            <small class="text-muted">${g.nuptk || g.nip || '-'}</small>
          </td>
          ${dayCells}
          <td class="fw-bold text-success text-center">${hCount}</td>
          <td class="fw-bold text-warning text-center">${tCount}</td>
          <td class="fw-bold text-info text-center">${iCount}</td>
          <td class="fw-bold text-danger text-center">${sCount}</td>
          <td class="fw-bold text-center" style="color: #8b5cf6;">${dCount}</td>
          <td class="fw-bold text-danger text-center">${aCount}</td>
          <td class="fw-bold text-center text-primary">${pct}%</td>
        </tr>
      `;
    }).join('');
  },

  // =========================================================================
  // STATISTIK & KEDISIPLINAN GURU
  // =========================================================================
  renderStatistics() {
    if (typeof Chart === 'undefined') return;

    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const absensiList = DB.getAll('absensi');

    // 1. Doughnut Chart Status
    let h = 0, t = 0, i = 0, s = 0, d = 0, a = 0;
    absensiList.forEach(rec => {
      if (rec.status_kehadiran === 'Hadir') h++;
      else if (rec.status_kehadiran === 'Terlambat') t++;
      else if (rec.status_kehadiran === 'Izin') i++;
      else if (rec.status_kehadiran === 'Sakit') s++;
      else if (rec.status_kehadiran === 'Dinas Luar') d++;
      else if (rec.status_kehadiran === 'Alpha') a++;
    });

    const ctxPie = document.getElementById('chart-absensi-status');
    if (ctxPie) {
      if (this.charts.status) this.charts.status.destroy();
      this.charts.status = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
          labels: ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Dinas Luar', 'Alpha'],
          datasets: [{
            data: [h || 1, t, i, s, d, a],
            backgroundColor: ['#10b981', '#f59e0b', '#06b6d4', '#ea580c', '#8b5cf6', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // 2. Bar Chart Monthly Trend
    const ctxBar = document.getElementById('chart-absensi-bulanan');
    if (ctxBar) {
      if (this.charts.monthly) this.charts.monthly.destroy();
      this.charts.monthly = new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
          datasets: [{
            label: 'Persentase Kehadiran (%)',
            data: [98, 96, 95, 97, 98, 94, 99, 98, 97, 96, 98, 99],
            backgroundColor: 'rgba(37, 99, 235, 0.85)',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 80, max: 100 }
          }
        }
      });
    }

    // 3. Leaderboard Kedisiplinan
    const leaderboardBody = document.getElementById('absensi-leaderboard-body');
    if (leaderboardBody) {
      const stats = guruList.map(g => {
        const records = absensiList.filter(rec => rec.guru_id === g.id);
        const hadir = records.filter(r => r.status_kehadiran === 'Hadir').length;
        const terlambat = records.filter(r => r.status_kehadiran === 'Terlambat').length;
        const izinSakit = records.filter(r => r.status_kehadiran === 'Izin' || r.status_kehadiran === 'Sakit').length;
        const total = records.length || 1;
        const score = Math.min(100, Math.round(((hadir + (terlambat * 0.7)) / total) * 100));

        let predikat = 'Sangat Baik';
        let badge = 'bg-success';
        if (score < 80) { predikat = 'Cukup'; badge = 'bg-warning text-dark'; }
        else if (score < 90) { predikat = 'Baik'; badge = 'bg-primary'; }

        return { guru: g, hadir, terlambat, izinSakit, score, predikat, badge };
      });

      stats.sort((a, b) => b.score - a.score);

      const medals = ['🥇', '🥈', '🥉'];
      leaderboardBody.innerHTML = stats.map((item, idx) => `
        <tr>
          <td class="text-center fw-bold fs-6">${medals[idx] || (idx + 1)}</td>
          <td>
            <div class="fw-bold text-dark">${Helpers.formatNamaGelar(item.guru)}</div>
            <small class="text-muted">NUPTK: ${item.guru.nuptk || '-'}</small>
          </td>
          <td class="text-center fw-bold text-success">${item.hadir} Hari</td>
          <td class="text-center fw-bold text-warning">${item.terlambat} Kali</td>
          <td class="text-center fw-bold text-info">${item.izinSakit} Kali</td>
          <td class="text-center fw-bold text-primary fs-6">${item.score}%</td>
          <td class="text-center"><span class="badge ${item.badge}">${item.predikat}</span></td>
        </tr>
      `).join('');
    }
  },

  syncToPKG() {
    const guruList = DB.getAll('guru');
    const absensiList = DB.getAll('absensi');
    const pkgList = DB.getAll('pkg');

    let updatedCount = 0;
    guruList.forEach(g => {
      const records = absensiList.filter(rec => rec.guru_id === g.id);
      const hadir = records.filter(r => r.status_kehadiran === 'Hadir').length;
      const terlambat = records.filter(r => r.status_kehadiran === 'Terlambat').length;
      const total = records.length || 1;
      const score = Math.min(100, Math.max(70, Math.round(((hadir + (terlambat * 0.7)) / total) * 100)));

      const pkgRecord = pkgList.find(p => p.guru_id === g.id && p.tahun_penilaian == this.selectedYear);
      if (pkgRecord) {
        DB.update('pkg', pkgRecord.id, { skor_kehadiran: score });
        updatedCount++;
      }
    });

    App.showToast('Sinkronisasi Berhasil', `Skor kedisiplinan ${updatedCount} guru berhasil disinkronkan ke modul Penilaian Kinerja Guru (PKG).`, 'success');
  },

  // =========================================================================
  // PENGATURAN JAM KERJA
  // =========================================================================
  saveSettings(e) {
    if (e) e.preventDefault();
    const settings = {
      jam_masuk: document.getElementById('setting-jam-masuk').value,
      jam_toleransi: document.getElementById('setting-jam-toleransi').value,
      jam_pulang_reguler: document.getElementById('setting-jam-pulang-reguler').value,
      jam_pulang_jumat: document.getElementById('setting-jam-pulang-jumat').value,
      jam_pulang_sabtu: document.getElementById('setting-jam-pulang-sabtu').value,
      hari_kerja: document.getElementById('hk6').checked ? 6 : 5
    };

    DB.state.pengaturan_absensi = settings;
    DB.saveState();
    App.showToast('Pengaturan Disimpan', 'Standar jam presensi dan toleransi keterlambatan telah diperbarui.', 'success');
    this.renderList();
    this.renderSummary();
  },

  // =========================================================================
  // EXPORT & CETAK LAPORAN PRESENSI
  // =========================================================================
  exportDailyExcel() {
    const list = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const absensiList = DB.getAll('absensi').filter(a => a.tanggal === this.selectedDate);

    const data = list.map((g, idx) => {
      const rec = absensiList.find(a => a.guru_id === g.id);
      return {
        'No': idx + 1,
        'Tanggal': this.selectedDate,
        'Nama Lengkap': Helpers.formatNamaGelar(g),
        'NUPTK': g.nuptk || '-',
        'NIP': g.nip || '-',
        'Status Kehadiran': rec ? rec.status_kehadiran : 'Belum Absen',
        'Jam Masuk': rec ? rec.waktu_masuk || '-' : '-',
        'Jam Pulang': rec ? rec.waktu_pulang || '-' : '-',
        'Keterangan': rec ? rec.keterangan || '-' : '-',
        'Nomor Surat': rec ? rec.nomor_surat || '-' : '-'
      };
    });

    ExportUtils.exportToExcel(data, `Daftar_Hadir_Guru_SDN_Sumber_Waru_2_${this.selectedDate}`, 'Presensi Harian');
    App.showToast('Ekspor Berhasil', `Presensi harian tanggal ${this.selectedDate} telah diekspor ke Excel.`, 'success');
  },

  exportMonthlyExcel() {
    const monthSelect = document.getElementById('filter-matrix-bulan');
    const yearSelect = document.getElementById('filter-matrix-tahun');
    const month = monthSelect ? parseInt(monthSelect.value) : this.selectedMonth;
    const year = yearSelect ? parseInt(yearSelect.value) : this.selectedYear;
    const monthStr = String(month).padStart(2, '0');
    const daysInMonth = Helpers.getDaysInMonth(year, month);

    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const absensiAll = DB.getAll('absensi');

    const data = guruList.map((g, idx) => {
      const row = {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'NUPTK': g.nuptk || '-'
      };

      let h = 0, t = 0, i = 0, s = 0, dCount = 0, a = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const isSun = Helpers.isSunday(year, month, d);
        const dayDateStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
        const record = absensiAll.find(rec => rec.guru_id === g.id && rec.tanggal === dayDateStr);

        if (isSun) {
          row[`Tgl ${d}`] = 'L';
        } else if (record) {
          const st = record.status_kehadiran;
          if (st === 'Hadir') { h++; row[`Tgl ${d}`] = 'H'; }
          else if (st === 'Terlambat') { t++; row[`Tgl ${d}`] = 'T'; }
          else if (st === 'Izin') { i++; row[`Tgl ${d}`] = 'I'; }
          else if (st === 'Sakit') { s++; row[`Tgl ${d}`] = 'S'; }
          else if (st === 'Dinas Luar') { dCount++; row[`Tgl ${d}`] = 'D'; }
          else if (st === 'Cuti') { row[`Tgl ${d}`] = 'C'; }
          else if (st === 'Alpha') { a++; row[`Tgl ${d}`] = 'A'; }
        } else {
          row[`Tgl ${d}`] = '-';
        }
      }

      row['Total H'] = h;
      row['Total T'] = t;
      row['Total I'] = i;
      row['Total S'] = s;
      row['Total D'] = dCount;
      row['Total A'] = a;

      return row;
    });

    ExportUtils.exportToExcel(data, `Rekap_Matrix_Absensi_${year}_Bulan_${month}`, 'Rekap Bulanan');
    App.showToast('Ekspor Matrix Berhasil', 'Rekap matriks presensi bulanan telah diekspor ke Excel.', 'success');
  },

  printDailySheet() {
    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const absensiList = DB.getAll('absensi').filter(a => a.tanggal === this.selectedDate);
    const profil = DB.state.profil_sekolah || {};

    const rows = guruList.map((g, idx) => {
      const rec = absensiList.find(a => a.guru_id === g.id);
      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><strong>${Helpers.formatNamaGelar(g)}</strong><br><small>NUPTK: ${g.nuptk || '-'}</small></td>
          <td style="text-align: center;">${rec ? rec.status_kehadiran : 'Belum Absen'}</td>
          <td style="text-align: center;">${rec ? rec.waktu_masuk || '-' : '-'}</td>
          <td style="text-align: center;">${rec ? rec.waktu_pulang || '-' : '-'}</td>
          <td>${rec ? rec.keterangan || '-' : '-'}</td>
          <td style="text-align: center; height: 35px;">
            <small style="color: #999;">${idx + 1}. ...................</small>
          </td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-3">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">DAFTAR HADIR HARIAN GURU & TENAGA KEPENDIDIKAN</h4>
        <p style="margin: 0; font-size: 11pt;">Hari / Tanggal: <strong>${Helpers.formatDateIndo(this.selectedDate)}</strong></p>
      </div>

      <table class="table-biodata-print" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr class="bg-head">
            <th style="width: 5%; text-align: center; border: 1px solid #000; padding: 6px;">No</th>
            <th style="width: 30%; border: 1px solid #000; padding: 6px;">Nama Guru / NUPTK</th>
            <th style="width: 15%; text-align: center; border: 1px solid #000; padding: 6px;">Status</th>
            <th style="width: 10%; text-align: center; border: 1px solid #000; padding: 6px;">Masuk</th>
            <th style="width: 10%; text-align: center; border: 1px solid #000; padding: 6px;">Pulang</th>
            <th style="width: 15%; border: 1px solid #000; padding: 6px;">Keterangan</th>
            <th style="width: 15%; text-align: center; border: 1px solid #000; padding: 6px;">Tanda Tangan</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid;">
        <div style="text-align: center; width: 220px;">
          <p style="margin-bottom: 60px;">Petugas Presensi / Piket,</p>
          <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">Ahmad Fauzi</p>
          <small>NIP. 198904122019031008</small>
        </div>
        ${App.getTandaTanganKS(Helpers.formatDateIndo(this.selectedDate))}
      </div>
    `;

    window.print();
  },

  printMonthlyMatrix() {
    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    const monthSelect = document.getElementById('filter-matrix-bulan');
    const yearSelect = document.getElementById('filter-matrix-tahun');
    const month = monthSelect ? parseInt(monthSelect.value) : this.selectedMonth;
    const year = yearSelect ? parseInt(yearSelect.value) : this.selectedYear;
    const monthName = monthSelect ? monthSelect.options[monthSelect.selectedIndex].text : 'Bulan';
    const daysInMonth = Helpers.getDaysInMonth(year, month);
    const profil = DB.state.profil_sekolah || {};
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    const absensiAll = DB.getAll('absensi');
    const monthStr = String(month).padStart(2, '0');

    let thDays = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const isSun = Helpers.isSunday(year, month, d);
      thDays += `<th style="border: 1px solid #000; padding: 2px; font-size: 8pt; ${isSun ? 'background: #fca5a5;' : ''}">${d}</th>`;
    }

    const rows = guruList.map((g, idx) => {
      let h = 0, t = 0, i = 0, s = 0, dCount = 0, a = 0;
      let dayCols = '';

      for (let d = 1; d <= daysInMonth; d++) {
        const isSun = Helpers.isSunday(year, month, d);
        const dayDateStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
        const rec = absensiAll.find(r => r.guru_id === g.id && r.tanggal === dayDateStr);

        if (isSun) {
          dayCols += `<td style="border: 1px solid #000; text-align: center; font-size: 8pt; background: #fee2e2;">L</td>`;
        } else if (rec) {
          const st = rec.status_kehadiran;
          if (st === 'Hadir') { h++; dayCols += `<td style="border: 1px solid #000; text-align: center; font-size: 8pt; color: green; font-weight: bold;">H</td>`; }
          else if (st === 'Terlambat') { t++; dayCols += `<td style="border: 1px solid #000; text-align: center; font-size: 8pt; color: #d97706; font-weight: bold;">T</td>`; }
          else if (st === 'Izin') { i++; dayCols += `<td style="border: 1px solid #000; text-align: center; font-size: 8pt; color: #0284c7; font-weight: bold;">I</td>`; }
          else if (st === 'Sakit') { s++; dayCols += `<td style="border: 1px solid #000; text-align: center; font-size: 8pt; color: #ea580c; font-weight: bold;">S</td>`; }
          else if (st === 'Dinas Luar') { dCount++; dayCols += `<td style="border: 1px solid #000; text-align: center; font-size: 8pt; color: #7c3aed; font-weight: bold;">D</td>`; }
          else if (st === 'Cuti') { dayCols += `<td style="border: 1px solid #000; text-align: center; font-size: 8pt; color: #0284c7; font-weight: bold;">C</td>`; }
          else if (st === 'Alpha') { a++; dayCols += `<td style="border: 1px solid #000; text-align: center; font-size: 8pt; color: red; font-weight: bold;">A</td>`; }
        } else {
          dayCols += `<td style="border: 1px solid #000; text-align: center; font-size: 8pt; color: #ccc;">-</td>`;
        }
      }

      return `
        <tr>
          <td style="border: 1px solid #000; text-align: center; font-size: 8.5pt;">${idx + 1}</td>
          <td style="border: 1px solid #000; font-size: 8.5pt; padding: 3px 6px;"><strong>${Helpers.formatNamaGelar(g)}</strong></td>
          ${dayCols}
          <td style="border: 1px solid #000; text-align: center; font-size: 8.5pt; font-weight: bold;">${h}</td>
          <td style="border: 1px solid #000; text-align: center; font-size: 8.5pt; font-weight: bold;">${t}</td>
          <td style="border: 1px solid #000; text-align: center; font-size: 8.5pt; font-weight: bold;">${i}</td>
          <td style="border: 1px solid #000; text-align: center; font-size: 8.5pt; font-weight: bold;">${s}</td>
          <td style="border: 1px solid #000; text-align: center; font-size: 8.5pt; font-weight: bold;">${dCount}</td>
          <td style="border: 1px solid #000; text-align: center; font-size: 8.5pt; font-weight: bold;">${a}</td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-2">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">REKAPITULASI PRESENSI BULANAN GURU & TENAGA KEPENDIDIKAN</h4>
        <p style="margin: 0; font-size: 10pt;">Periode: <strong>${monthName} ${year}</strong></p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 4px; font-size: 8.5pt;" rowspan="2">No</th>
            <th style="border: 1px solid #000; padding: 4px; font-size: 8.5pt;" rowspan="2">Nama Guru</th>
            <th style="border: 1px solid #000; padding: 4px; font-size: 8.5pt; text-align: center;" colspan="${daysInMonth}">Tanggal</th>
            <th style="border: 1px solid #000; padding: 4px; font-size: 8.5pt; text-align: center;" colspan="6">Rekap</th>
          </tr>
          <tr style="background: #f8fafc;">
            ${thDays}
            <th style="border: 1px solid #000; padding: 2px; font-size: 8pt;">H</th>
            <th style="border: 1px solid #000; padding: 2px; font-size: 8pt;">T</th>
            <th style="border: 1px solid #000; padding: 2px; font-size: 8pt;">I</th>
            <th style="border: 1px solid #000; padding: 2px; font-size: 8pt;">S</th>
            <th style="border: 1px solid #000; padding: 2px; font-size: 8pt;">D</th>
            <th style="border: 1px solid #000; padding: 2px; font-size: 8pt;">A</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; margin-top: 25px; page-break-inside: avoid;">
        <div style="text-align: center; width: 220px; font-size: 9pt;">
          <p style="margin-bottom: 50px;">Koordinator Presensi,</p>
          <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">Siti Rahmawati, S.Pd.</p>
          <small>NIP. 197508202005012006</small>
        </div>
        ${App.getTandaTanganKS(Helpers.formatDateIndo(new Date().toISOString().slice(0, 10)))}
      </div>
    `;

    window.print();
  }
};
