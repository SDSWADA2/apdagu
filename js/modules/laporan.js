/**
 * ============================================================================
 * MODUL LAPORAN, CETAK BIODATA A4, GENERATOR ID CARD GURU & PUSAT EKSPOR EXCEL/PDF
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const LaporanModule = {
  activeIDCardGuruId: 1,

  init() {
    this.bindEvents();
    this.renderGuruSelect();
  },

  bindEvents() {
    const guruSelect = document.getElementById('laporan-guru-select');
    if (guruSelect) {
      guruSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.activeIDCardGuruId = parseInt(e.target.value);
          this.renderIDCardPreview(this.activeIDCardGuruId);
        }
      });
    }
  },

  renderGuruSelect() {
    const guruSelect = document.getElementById('laporan-guru-select');
    if (!guruSelect) return;
    const guruList = DB.getAll('guru');
    guruSelect.innerHTML = guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)}</option>`).join('');
    if (guruList.length > 0) {
      this.activeIDCardGuruId = guruList[0].id;
      this.renderIDCardPreview(this.activeIDCardGuruId);
    }
  },

  /**
   * Render ID Card Guru 2 Sisi (Front & Back)
   */
  renderIDCardPreview(guruId) {
    const guru = DB.getById('guru', guruId);
    if (!guru) return;

    const kep = DB.getAll('kepegawaian').find(k => k.guru_id === guru.id) || {};
    const sekolah = DB.state.profil_sekolah || {};
    const container = document.getElementById('idcard-preview-container');
    if (!container) return;

    const logoHtml = sekolah.logo_url 
      ? `<img src="${sekolah.logo_url}" alt="Logo">`
      : `<i class="bi bi-mortarboard-fill"></i>`;

    container.innerHTML = `
      <div class="idcard-preview-wrapper" id="idcard-printable-area">
        <!-- KARTU SISI DEPAN (FRONT) -->
        <div class="id-card" id="idcard-front">
          <div class="id-card-header">
            <div class="id-card-logo-ring">${logoHtml}</div>
            <h6 class="school-name">${sekolah.nama_sekolah || 'SD NEGERI SUMBER WARU 2'}</h6>
            <p class="card-subtitle">KARTU IDENTITAS RESMI PENDIDIK & TENAGA KEPENDIDIKAN</p>
          </div>

          <div class="id-card-body-front">
            <div class="id-card-photo-wrapper">
              <img src="${guru.foto_url || generateAvatar(guru.nama_lengkap)}" class="id-card-photo" alt="${guru.nama_lengkap}">
            </div>

            <h5 class="id-card-guru-name">${Helpers.formatNamaGelar(guru)}</h5>
            <div class="id-card-guru-role">${kep.jabatan || 'Guru Kelas'}</div>

            <table class="id-card-details-table">
              <tr>
                <td class="label">NUPTK</td>
                <td class="colon">:</td>
                <td class="value">${guru.nuptk || '-'}</td>
              </tr>
              <tr>
                <td class="label">NIP</td>
                <td class="colon">:</td>
                <td class="value">${guru.nip || '-'}</td>
              </tr>
              <tr>
                <td class="label">Status</td>
                <td class="colon">:</td>
                <td class="value">${kep.status_kepegawaian || 'PNS'}</td>
              </tr>
              <tr>
                <td class="label">Golongan</td>
                <td class="colon">:</td>
                <td class="value">${kep.pangkat_golongan || '-'}</td>
              </tr>
            </table>
          </div>

          <div class="id-card-validity">
            Masa Berlaku: Selama Menjadi Pendidik Aktif
          </div>

          <div class="id-card-footer">
            <div class="id-card-qr-box" id="idcard-qr-front"></div>
            <div class="id-card-barcode-box">
              <div class="id-card-barcode-lines"></div>
              <div class="id-card-barcode-text">ID: ${sekolah.npsn || '20527136'}-${guru.id}-${guru.nuptk ? guru.nuptk.slice(-4) : '2026'}</div>
            </div>
          </div>
        </div>

        <!-- KARTU SISI BELAKANG (BACK) -->
        <div class="id-card id-card-back" id="idcard-back">
          <div class="id-card-back-header">
            <h6>KETENTUAN PENGGUNAAN KARTU</h6>
          </div>

          <div class="id-card-back-body">
            <ol class="id-card-terms">
              <li>Kartu ini adalah identitas resmi guru / staf ${sekolah.nama_sekolah || 'SD Negeri Sumber Waru 2'}.</li>
              <li>Wajib dipakai selama jam dinas dan kegiatan resmi kependidikan.</li>
              <li>Kartu tidak dapat dipindahtangankan kepada pihak lain.</li>
              <li>Jika menemukan kartu ini, harap dikembalikan ke: <strong>${sekolah.nama_sekolah || 'SD Negeri Sumber Waru 2'}, ${sekolah.alamat || 'Jl. Pendidikan No. 45, Waru, Pamekasan'}</strong>.</li>
            </ol>

            <div class="id-card-back-sign">
              <div class="sign-date">${sekolah.kabupaten || 'Pamekasan'}, ${Helpers.formatDateIndo(new Date().toISOString())}</div>
              <div class="sign-title">Kepala Sekolah</div>
              <div class="sign-img-placeholder">
                <img src="${DEFAULT_SIGNATURE}" alt="TTD Kepala Sekolah">
              </div>
              <div class="sign-name">${sekolah.nama_kepala_sekolah || 'Drs. H. Bambang Sutrisno, M.Pd.'}</div>
              <div class="sign-nip">NIP. ${sekolah.nip_kepala_sekolah || '196805121992031004'}</div>
            </div>
          </div>

          <div class="id-card-back-footer">
            NPSN: ${sekolah.npsn || '20527136'} &bull; KEMDIKBUDRISTEK
          </div>
        </div>
      </div>
    `;

    // Render QR Code pada kartu depan
    setTimeout(() => {
      ExportUtils.renderQRCode('idcard-qr-front', `VERIFIKASI-SDN-SUMBER-WARU-2-GURU-${guru.id}-${guru.nama_lengkap}-${guru.nuptk}`, 50);
    }, 100);
  },

  previewIDCard(guruId) {
    this.activeIDCardGuruId = guruId;
    const guruSelect = document.getElementById('laporan-guru-select');
    if (guruSelect) guruSelect.value = guruId;

    App.switchView('view-laporan');
    this.renderIDCardPreview(guruId);
  },

  downloadIDCardImage() {
    const guru = DB.getById('guru', this.activeIDCardGuruId);
    const nama = guru ? guru.nama_lengkap.replace(/\s+/g, '_') : 'Guru';
    ExportUtils.downloadElementAsImage('idcard-printable-area', `ID_CARD_${nama}_SDN_SUMBER_WARU_2`);
  },

  downloadIDCardPDF() {
    const guru = DB.getById('guru', this.activeIDCardGuruId);
    const nama = guru ? guru.nama_lengkap.replace(/\s+/g, '_') : 'Guru';
    ExportUtils.exportElementToPDF('idcard-printable-area', `ID_CARD_${nama}_SDN_SUMBER_WARU_2`, 'landscape');
  },

  printIDCard() {
    window.print();
  },

  /**
   * Cetak Biodata Lengkap Guru Format A4 Resmi Standar Dinas
   */
  printBiodataA4(guruId) {
    const guru = DB.getById('guru', guruId);
    if (!guru) return;

    const kep = DB.getAll('kepegawaian').find(k => k.guru_id === guru.id) || {};
    const pendList = DB.getAll('pendidikan').filter(p => p.guru_id === guru.id);
    const sertList = DB.getAll('sertifikasi').filter(s => s.guru_id === guru.id);
    const masaKerja = Helpers.calculateMasaKerja(kep.tmt_pengangkatan);
    const age = Helpers.calculateAge(guru.tanggal_lahir);

    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-3">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">BIODATA LENGKAP PENDIDIK & TENAGA KEPENDIDIKAN</h4>
        <small>Nomor Arsip Dapodik: DAPODIK/SDN2/2026/G-${guru.id}</small>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 15px;">
        <div style="width: 140px; text-align: center;">
          <img src="${guru.foto_url || generateAvatar(guru.nama_lengkap)}" style="width: 120px; height: 150px; object-fit: cover; border: 1px solid #000; padding: 2px;" alt="Foto Guru">
          <div style="margin-top: 10px;" id="a4-qr-code"></div>
        </div>

        <div style="flex: 1;">
          <table class="table-biodata-print">
            <tr class="bg-head"><td colspan="3">A. IDENTITAS PRIBADI</td></tr>
            <tr><td width="35%">Nama Lengkap</td><td width="3%">:</td><td><strong>${Helpers.formatNamaGelar(guru)}</strong></td></tr>
            <tr><td>NUPTK</td><td>:</td><td><strong>${guru.nuptk || '-'}</strong></td></tr>
            <tr><td>NIP</td><td>:</td><td><strong>${guru.nip || '-'}</strong></td></tr>
            <tr><td>NIK (No. KTP)</td><td>:</td><td>${guru.nik || '-'}</td></tr>
            <tr><td>No. Kartu Keluarga</td><td>:</td><td>${guru.no_kk || '-'}</td></tr>
            <tr><td>NPWP</td><td>:</td><td>${guru.npwp || '-'}</td></tr>
            <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>${guru.tempat_lahir}, ${Helpers.formatDateIndo(guru.tanggal_lahir)} (Usia ${age} Tahun)</td></tr>
            <tr><td>Jenis Kelamin / Agama</td><td>:</td><td>${guru.jenis_kelamin} / ${guru.agama}</td></tr>
            <tr><td>Status Pernikahan</td><td>:</td><td>${guru.status_pernikahan}</td></tr>
            <tr><td>Nomor HP / WhatsApp</td><td>:</td><td>${guru.no_hp || '-'}</td></tr>
            <tr><td>Alamat Email</td><td>:</td><td>${guru.email || '-'}</td></tr>
            <tr><td>Alamat Tempat Tinggal</td><td>:</td><td>${guru.alamat_jalan}, RT ${guru.rt_rw}, Ds. ${guru.desa_kelurahan}, Kec. ${guru.kecamatan}, Kab. ${guru.kabupaten_kota}, ${guru.provinsi} (${guru.kode_pos})</td></tr>
          </table>
        </div>
      </div>

      <table class="table-biodata-print" style="margin-bottom: 15px;">
        <tr class="bg-head"><td colspan="3">B. STATUS KEPEGAWAIAN</td></tr>
        <tr><td width="35%">Status Kepegawaian</td><td width="3%">:</td><td><strong>${kep.status_kepegawaian || '-'}</strong></td></tr>
        <tr><td>Jabatan Utama</td><td>:</td><td>${kep.jabatan || 'Guru Kelas'}</td></tr>
        <tr><td>Pangkat / Golongan Ruang</td><td>:</td><td>${kep.pangkat_golongan || '-'}</td></tr>
        <tr><td>TMT Pengangkatan</td><td>:</td><td>${Helpers.formatDateIndo(kep.tmt_pengangkatan)} (Masa Kerja: ${masaKerja.text})</td></tr>
        <tr><td>Nomor SK Pengangkatan</td><td>:</td><td>${kep.nomor_sk || '-'}</td></tr>
        <tr><td>Unit Kerja</td><td>:</td><td>SD Negeri Sumber Waru 2</td></tr>
      </table>

      <table class="table-biodata-print" style="margin-bottom: 15px;">
        <tr class="bg-head"><td colspan="4">C. RIWAYAT PENDIDIKAN FORMAL</td></tr>
        <tr style="font-weight:bold; background:#f8fafc;">
          <td>Jenjang</td><td>Nama Perguruan Tinggi / Sekolah</td><td>Program Studi</td><td>Tahun Lulus</td>
        </tr>
        ${pendList.map(p => `
          <tr><td>${p.jenjang}</td><td>${p.nama_institusi}</td><td>${p.program_studi}</td><td>${p.tahun_lulus} (IPK: ${p.ipk || '-'})</td></tr>
        `).join('')}
      </table>

      <div class="ttd-container-print">
        <div class="ttd-box">
          <div>Guru yang Bersangkutan,</div>
          <div class="ttd-space">
            <img src="${guru.tanda_tangan_url || DEFAULT_SIGNATURE}" style="max-height: 60px;" alt="TTD">
          </div>
          <div style="font-weight: bold; text-decoration: underline;">${Helpers.formatNamaGelar(guru)}</div>
          <div>NIP. ${guru.nip || '-'}</div>
        </div>

        ${App.getTandaTanganKS(Helpers.formatDateIndo(new Date().toISOString()))}
      </div>
    `;

    setTimeout(() => {
      ExportUtils.renderQRCode('a4-qr-code', `VALIDASI-BIODATA-A4-SDN2-${guru.id}-${guru.nuptk || guru.nip}`, 80);
      window.print();
    }, 200);
  },

  // ==========================================================================
  // SEMUA FUNGSI EKSPOR EXCEL LENGKAP (.XLSX)
  // ==========================================================================

  /**
   * Ekspor Satu File Excel Multi-Sheet Berisi Seluruh Database Guru
   */
  exportMultiSheetMasterExcel() {
    const sheets = {};

    // 1. Sheet Master Guru
    const list = DB.getAll('guru');
    const kepList = DB.getAll('kepegawaian');
    sheets['Master Guru'] = list.map((g, idx) => {
      const kep = kepList.find(k => k.guru_id === g.id) || {};
      const masaKerja = Helpers.calculateMasaKerja(kep.tmt_pengangkatan);
      return {
        'No': idx + 1,
        'NUPTK': g.nuptk || '-',
        'NIP': g.nip || '-',
        'Nama Lengkap': Helpers.formatNamaGelar(g),
        'Jenis Kelamin': g.jenis_kelamin,
        'Tempat Lahir': g.tempat_lahir,
        'Tanggal Lahir': g.tanggal_lahir,
        'Usia (Th)': Helpers.calculateAge(g.tanggal_lahir),
        'Agama': g.agama,
        'Status Pernikahan': g.status_pernikahan,
        'NIK': g.nik || '-',
        'No KK': g.no_kk || '-',
        'NPWP': g.npwp || '-',
        'No HP / WA': g.no_hp || '-',
        'Email': g.email || '-',
        'Status Pegawai': kep.status_kepegawaian || '-',
        'Jabatan': kep.jabatan || '-',
        'Pangkat/Gol': kep.pangkat_golongan || '-',
        'TMT': kep.tmt_pengangkatan || '-',
        'Masa Kerja': masaKerja.text,
        'Alamat Lengkap': `${g.alamat_jalan}, RT ${g.rt_rw}, Ds. ${g.desa_kelurahan}, Kec. ${g.kecamatan}, Kab. ${g.kabupaten_kota}`
      };
    });

    // 2. Sheet Pendidikan
    sheets['Pendidikan'] = DB.getAll('pendidikan').map((p, idx) => {
      const g = DB.getById('guru', p.guru_id) || {};
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'Jenjang': p.jenjang,
        'Perguruan Tinggi': p.nama_institusi,
        'Program Studi': p.program_studi,
        'Tahun Masuk': p.tahun_masuk,
        'Tahun Lulus': p.tahun_lulus,
        'IPK': p.ipk || '-',
        'No Ijazah': p.nomor_ijazah || '-'
      };
    });

    // 3. Sheet Sertifikasi
    sheets['Sertifikasi'] = DB.getAll('sertifikasi').map((s, idx) => {
      const g = DB.getById('guru', s.guru_id) || {};
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'Bidang Studi': s.bidang_studi,
        'No Sertifikat': s.nomor_sertifikat,
        'NRG': s.nomor_registrasi_guru || '-',
        'LPTK': s.lptk_penyelenggara,
        'Tahun': s.tahun_sertifikasi,
        'Status': s.status_berlaku
      };
    });

    // 4. Sheet Beban Mengajar
    sheets['Beban Mengajar'] = DB.getAll('beban_mengajar').map((b, idx) => {
      const g = DB.getById('guru', b.guru_id) || {};
      const totalJP = (parseInt(b.jp_tatap_muka) || 0) + (parseInt(b.jp_tugas_tambahan) || 0) + (parseInt(b.jp_ekskul) || 0);
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'JP Tatap Muka': b.jp_tatap_muka,
        'Tugas Tambahan': b.tugas_tambahan || '-',
        'JP Tugas Tambahan': b.jp_tugas_tambahan || 0,
        'Ekstrakurikuler': b.ekstrakurikuler || '-',
        'JP Ekskul': b.jp_ekskul || 0,
        'Total JP': totalJP,
        'Status 24 JP': totalJP >= 24 ? 'Terpenuhi' : 'Belum Terpenuhi',
        'Keterangan': b.keterangan || '-'
      };
    });

    // 5. Sheet PKG
    sheets['Penilaian PKG'] = DB.getAll('pkg').map((pk, idx) => {
      const g = DB.getById('guru', pk.guru_id) || {};
      return {
        'No': idx + 1,
        'Tahun': pk.tahun_penilaian,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'Perencanaan': pk.skor_perencanaan,
        'Pelaksanaan': pk.skor_pelaksanaan,
        'Evaluasi': pk.skor_evaluasi,
        'Profesionalisme': pk.skor_profesionalisme,
        'Kehadiran': pk.skor_kehadiran,
        'Nilai Akhir': pk.nilai_akhir,
        'Predikat': pk.predikat,
        'Penilai': pk.nama_penilai
      };
    });

    // 6. Sheet Presensi
    sheets['Presensi'] = DB.getAll('absensi').map((a, idx) => {
      const g = DB.getById('guru', a.guru_id) || {};
      return {
        'No': idx + 1,
        'Tanggal': a.tanggal,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'Status': a.status_kehadiran,
        'Jam Masuk': a.waktu_masuk || '-',
        'Jam Pulang': a.waktu_pulang || '-',
        'Keterangan': a.keterangan || '-'
      };
    });

    ExportUtils.exportMultiSheetExcel(sheets, 'DATABASE_MASTER_LENGKAP_SDN_SUMBER_WARU_2');
    App.showToast('Ekspor Multi-Sheet Berhasil', 'Seluruh database telah diekspor ke dalam satu file Excel multi-sheet.', 'success');
  },

  exportGuruExcel() {
    const list = DB.getAll('guru');
    const kepList = DB.getAll('kepegawaian');
    const data = list.map((g, idx) => {
      const kep = kepList.find(k => k.guru_id === g.id) || {};
      const masaKerja = Helpers.calculateMasaKerja(kep.tmt_pengangkatan);
      return {
        'No': idx + 1,
        'NUPTK': g.nuptk || '-',
        'NIP': g.nip || '-',
        'Nama Lengkap': Helpers.formatNamaGelar(g),
        'Jenis Kelamin': g.jenis_kelamin,
        'Tempat Lahir': g.tempat_lahir,
        'Tanggal Lahir': g.tanggal_lahir,
        'Usia (Th)': Helpers.calculateAge(g.tanggal_lahir),
        'Agama': g.agama,
        'Status Kepegawaian': kep.status_kepegawaian || '-',
        'Jabatan': kep.jabatan || '-',
        'Pangkat/Golongan': kep.pangkat_golongan || '-',
        'TMT': kep.tmt_pengangkatan || '-',
        'Masa Kerja': masaKerja.text,
        'No HP / WA': g.no_hp || '-',
        'Email': g.email || '-',
        'Alamat Lengkap': `${g.alamat_jalan}, RT ${g.rt_rw}, Ds. ${g.desa_kelurahan}, Kec. ${g.kecamatan}, Kab. ${g.kabupaten_kota}`
      };
    });

    ExportUtils.exportToExcel(data, 'Data_Guru_Lengkap_SDN_Sumber_Waru_2', 'Data Guru');
    App.showToast('Ekspor Berhasil', 'Data guru telah diekspor ke Excel (.xlsx)', 'success');
  },

  exportNUPTKExcel() {
    const list = DB.getAll('guru');
    const data = list.map((g, idx) => ({
      'No': idx + 1,
      'NUPTK': g.nuptk || '-',
      'Nama Lengkap': Helpers.formatNamaGelar(g),
      'Jenis Kelamin': g.jenis_kelamin,
      'Tempat, Tgl Lahir': `${g.tempat_lahir}, ${g.tanggal_lahir}`,
      'Status Aktif': g.status_keaktifan || 'Aktif'
    }));

    ExportUtils.exportToExcel(data, 'Daftar_NUPTK_Guru_SDN_Sumber_Waru_2', 'Daftar NUPTK');
    App.showToast('Ekspor Berhasil', 'Daftar NUPTK telah diekspor ke Excel.', 'success');
  },

  exportNIPExcel() {
    const list = DB.getAll('guru');
    const kepList = DB.getAll('kepegawaian');
    const data = list.map((g, idx) => {
      const kep = kepList.find(k => k.guru_id === g.id) || {};
      return {
        'No': idx + 1,
        'NIP': g.nip || '-',
        'Nama Lengkap': Helpers.formatNamaGelar(g),
        'Status Kepegawaian': kep.status_kepegawaian || '-',
        'Pangkat / Golongan': kep.pangkat_golongan || '-',
        'Jabatan': kep.jabatan || '-'
      };
    });

    ExportUtils.exportToExcel(data, 'Daftar_NIP_Kepegawaian_SDN_Sumber_Waru_2', 'Daftar NIP');
    App.showToast('Ekspor Berhasil', 'Daftar NIP telah diekspor ke Excel.', 'success');
  },

  exportPendidikanExcel() {
    const list = DB.getAll('pendidikan');
    const data = list.map((p, idx) => {
      const g = DB.getById('guru', p.guru_id) || {};
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'NUPTK': g.nuptk || '-',
        'Jenjang': p.jenjang,
        'Nama Perguruan Tinggi': p.nama_institusi,
        'Program Studi': p.program_studi,
        'Tahun Masuk': p.tahun_masuk,
        'Tahun Lulus': p.tahun_lulus,
        'IPK': p.ipk || '-',
        'No Ijazah': p.nomor_ijazah || '-'
      };
    });

    ExportUtils.exportToExcel(data, 'Rekap_Pendidikan_Guru_SDN_Sumber_Waru_2', 'Pendidikan Guru');
    App.showToast('Ekspor Berhasil', 'Rekap Pendidikan telah diekspor ke Excel.', 'success');
  },

  exportSertifikasiExcel() {
    const list = DB.getAll('sertifikasi');
    const data = list.map((s, idx) => {
      const g = DB.getById('guru', s.guru_id) || {};
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'Bidang Studi': s.bidang_studi,
        'Nomor Sertifikat': s.nomor_sertifikat,
        'NRG': s.nomor_registrasi_guru || '-',
        'LPTK Penyelenggara': s.lptk_penyelenggara,
        'Tahun Sertifikasi': s.tahun_sertifikasi,
        'Status': s.status_berlaku
      };
    });

    ExportUtils.exportToExcel(data, 'Rekap_Sertifikasi_Guru_SDN_Sumber_Waru_2', 'Sertifikasi');
    App.showToast('Ekspor Berhasil', 'Rekap Sertifikasi telah diekspor ke Excel.', 'success');
  },

  exportJadwalExcel() {
    const list = DB.getAll('jadwal_mengajar');
    const data = list.map((j, idx) => {
      const g = DB.getById('guru', j.guru_id) || {};
      return {
        'No': idx + 1,
        'Hari': j.hari,
        'Jam Ke': j.jam_ke,
        'Waktu': `${j.waktu_mulai} - ${j.waktu_selesai}`,
        'Kelas': j.kelas,
        'Mata Pelajaran': j.mata_pelajaran,
        'Guru Pengajar': Helpers.formatNamaGelar(g),
        'Ruangan': j.ruangan,
        'Jumlah JP': j.jumlah_jp
      };
    });

    ExportUtils.exportToExcel(data, 'Jadwal_Mengajar_Kurikulum_Merdeka_SDN_Sumber_Waru_2', 'Jadwal');
    App.showToast('Ekspor Berhasil', 'Jadwal mengajar telah diekspor ke Excel.', 'success');
  },

  exportBebanExcel() {
    const list = DB.getAll('beban_mengajar');
    const data = list.map((b, idx) => {
      const g = DB.getById('guru', b.guru_id) || {};
      const totalJP = (parseInt(b.jp_tatap_muka) || 0) + (parseInt(b.jp_tugas_tambahan) || 0) + (parseInt(b.jp_ekskul) || 0);
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(g),
        'JP Tatap Muka': b.jp_tatap_muka,
        'Tugas Tambahan': b.tugas_tambahan || '-',
        'JP Tugas Tambahan': b.jp_tugas_tambahan || 0,
        'Ekstrakurikuler': b.ekstrakurikuler || '-',
        'JP Ekskul': b.jp_ekskul || 0,
        'Total JP Mingguan': totalJP,
        'Validasi 24 JP': totalJP >= 24 ? 'Terpenuhi' : 'Belum Terpenuhi',
        'Keterangan': b.keterangan || '-'
      };
    });

    ExportUtils.exportToExcel(data, 'Rekap_Beban_Mengajar_24_JP_SDN_Sumber_Waru_2', 'Beban Mengajar');
    App.showToast('Ekspor Berhasil', 'Rekap Beban Mengajar 24 JP telah diekspor ke Excel.', 'success');
  },

  exportAbsensiExcel() {
    const list = DB.getAll('absensi');
    const data = list.map((a, idx) => {
      const guru = DB.getById('guru', a.guru_id) || {};
      return {
        'No': idx + 1,
        'Tanggal': a.tanggal,
        'Nama Guru': Helpers.formatNamaGelar(guru),
        'NUPTK': guru.nuptk || '-',
        'Status Kehadiran': a.status_kehadiran,
        'Waktu Masuk': a.waktu_masuk || '-',
        'Waktu Pulang': a.waktu_pulang || '-',
        'Keterangan': a.keterangan || '-'
      };
    });

    ExportUtils.exportToExcel(data, 'Rekap_Presensi_Guru_SDN_Sumber_Waru_2', 'Presensi');
    App.showToast('Ekspor Berhasil', 'Rekap presensi telah diekspor ke Excel.', 'success');
  },

  exportPKGExcel() {
    const list = DB.getAll('pkg');
    const data = list.map((p, idx) => {
      const guru = DB.getById('guru', p.guru_id) || {};
      return {
        'No': idx + 1,
        'Tahun Penilaian': p.tahun_penilaian,
        'Nama Guru': Helpers.formatNamaGelar(guru),
        'NUPTK': guru.nuptk || '-',
        'Skor Perencanaan': p.skor_perencanaan,
        'Skor Pelaksanaan': p.skor_pelaksanaan,
        'Skor Evaluasi': p.skor_evaluasi,
        'Skor Profesionalisme': p.skor_profesionalisme,
        'Skor Kehadiran': p.skor_kehadiran,
        'Nilai Akhir': p.nilai_akhir,
        'Predikat': p.predikat,
        'Nama Penilai': p.nama_penilai
      };
    });

    ExportUtils.exportToExcel(data, 'Rekap_Nilai_PKG_SDN_Sumber_Waru_2', 'Rekap PKG');
    App.showToast('Ekspor Berhasil', 'Rekap PKG telah diekspor ke Excel.', 'success');
  },

  exportPrestasiExcel() {
    const list = DB.getAll('prestasi');
    const data = list.map((pr, idx) => {
      const guru = DB.getById('guru', pr.guru_id) || {};
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(guru),
        'Kategori': pr.kategori,
        'Nama Prestasi': pr.nama_prestasi,
        'Tingkat': pr.tingkat,
        'Peringkat Juara': pr.peringkat_juara,
        'Tahun': pr.tahun,
        'Penyelenggara': pr.penyelenggara,
        'Nomor Piagam': pr.nomor_piagam || '-'
      };
    });

    ExportUtils.exportToExcel(data, 'Rekap_Prestasi_Guru_SDN_Sumber_Waru_2', 'Prestasi');
    App.showToast('Ekspor Berhasil', 'Rekap prestasi telah diekspor ke Excel.', 'success');
  },

  exportPelatihanExcel() {
    const list = DB.getAll('pelatihan');
    const data = list.map((pl, idx) => {
      const guru = DB.getById('guru', pl.guru_id) || {};
      return {
        'No': idx + 1,
        'Nama Guru': Helpers.formatNamaGelar(guru),
        'Nama Diklat / Topik PMM': pl.nama_pelatihan,
        'Jenis Kegiatan': pl.jenis_pelatihan,
        'Pola JP': pl.pola_jp,
        'Penyelenggara': pl.penyelenggara,
        'Periode': `${pl.tanggal_mulai} s.d ${pl.tanggal_selesai}`,
        'Tahun': pl.tahun,
        'No Sertifikat': pl.nomor_sertifikat || '-'
      };
    });

    ExportUtils.exportToExcel(data, 'Rekap_Pelatihan_PMM_Diklat_SDN_Sumber_Waru_2', 'Pelatihan');
    App.showToast('Ekspor Berhasil', 'Rekap pelatihan telah diekspor ke Excel.', 'success');
  },

  exportDokumenExcel() {
    const list = DB.getAll('dokumen');
    const data = list.map((d, idx) => {
      const guru = DB.getById('guru', d.guru_id) || {};
      return {
        'No': idx + 1,
        'Nama Guru Pemilik': Helpers.formatNamaGelar(guru),
        'Kategori Dokumen': d.kategori_dokumen,
        'Nama Dokumen': d.nama_dokumen,
        'Nomor Dokumen': d.nomor_dokumen || '-',
        'Tanggal Terbit': d.tanggal_terbit || '-',
        'Tanggal Kadaluarsa': d.tanggal_kadaluarsa || '-',
        'Ukuran File (KB)': d.ukuran_file_kb || '-'
      };
    });

    ExportUtils.exportToExcel(data, 'Rekap_Dokumen_E_Arsip_SDN_Sumber_Waru_2', 'Dokumen');
    App.showToast('Ekspor Berhasil', 'Rekap dokumen e-arsip telah diekspor ke Excel.', 'success');
  }
};
