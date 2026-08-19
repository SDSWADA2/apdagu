/**
 * ============================================================================
 * EXPORT & IMPORT UTILITIES - SHEETJS (EXCEL/CSV), JSPDF, HTML2CANVAS & QRCODE
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const ExportUtils = {
  /**
   * Ekspor data tabel / array objek ke format Microsoft Excel (.xlsx) dengan styling kolom
   */
  exportToExcel(data, filename, sheetName = 'Data') {
    try {
      if (typeof XLSX === 'undefined') {
        App.showToast('Library Tidak Ditemukan', 'Library SheetJS (XLSX) belum dimuat.', 'danger');
        return;
      }
      if (!data || data.length === 0) {
        App.showToast('Data Kosong', 'Tidak ada data yang dapat diekspor.', 'warning');
        return;
      }
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      const maxCols = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length + 5, ...data.map(row => String(row[key] !== null && row[key] !== undefined ? row[key] : '').length + 4))
      }));
      worksheet['!cols'] = maxCols;
      const cleanFilename = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, cleanFilename);
      App.showToast('Ekspor Excel Berhasil', `"${cleanFilename}" berhasil diunduh (${data.length} baris).`, 'success');
    } catch (err) {
      console.error('Gagal mengekspor Excel:', err);
      App.showToast('Ekspor Gagal', 'Terjadi kesalahan: ' + err.message, 'danger');
    }
  },

  /**
   * Ekspor multi-sheet workbook Excel (.xlsx) sekaligus
   */
  exportMultiSheetExcel(sheetsMap, filename) {
    try {
      if (typeof XLSX === 'undefined') {
        App.showToast('Library Tidak Ditemukan', 'Library SheetJS (XLSX) belum dimuat.', 'danger');
        return;
      }

      const workbook = XLSX.utils.book_new();

      for (const [sheetName, sheetData] of Object.entries(sheetsMap)) {
        const safeData = sheetData && sheetData.length > 0 ? sheetData : [{ 'Status': 'Tidak ada data' }];
        const worksheet = XLSX.utils.json_to_sheet(safeData);
        const maxCols = Object.keys(safeData[0] || {}).map(key => ({
          wch: Math.max(key.length + 5, ...safeData.map(row => String(row[key] !== null && row[key] !== undefined ? row[key] : '').length + 4))
        }));
        worksheet['!cols'] = maxCols;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
      }

      const cleanFilename = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, cleanFilename);
      App.showToast('Ekspor Multi-Sheet Berhasil', `"${cleanFilename}" dengan ${Object.keys(sheetsMap).length} sheet berhasil diunduh.`, 'success');
    } catch (err) {
      console.error('Gagal mengekspor Multi-Sheet Excel:', err);
      App.showToast('Ekspor Gagal', 'Terjadi kesalahan: ' + err.message, 'danger');
    }
  },

  /**
   * Ekspor data ke format CSV (lebih ringan, cocok untuk spreadsheet tunggal)
   */
  exportToCSV(data, filename) {
    try {
      if (!data || data.length === 0) {
        App.showToast('Data Kosong', 'Tidak ada data yang dapat diekspor ke CSV.', 'warning');
        return;
      }
      const headers = Object.keys(data[0]);
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Fix untuk Excel: Memaksa NIP, NUPTK, No HP agar diawali string text (mencegah hilang angka 0)
        if (/^[0-9]{10,}$/.test(str)) {
          return `="""${str}"""`;
        }
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const csvLines = [
        headers.join(','),
        ...data.map(row => headers.map(h => escapeCSV(row[h])).join(','))
      ];
      const bom = '\uFEFF'; // UTF-8 BOM agar Excel bisa membaca karakter Indonesia
      const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      App.showToast('Ekspor CSV Berhasil', `File CSV berhasil diunduh (${data.length} baris).`, 'success');
    } catch (err) {
      console.error('Gagal mengekspor CSV:', err);
      App.showToast('Ekspor CSV Gagal', 'Terjadi kesalahan: ' + err.message, 'danger');
    }
  },

  /**
   * Export JSON Backup (Full Database)
   */
  exportJSONBackup() {
    try {
      const jsonStr = DB.exportJSON();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BACKUP_DATABASE_GURU_SDN_SUMBER_WARU_2_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      DB.logActivity('Backup Database', 'system', 'Backup database diunduh dalam format JSON');
      App.showToast('Backup JSON Berhasil', 'Seluruh database berhasil diekspor sebagai file cadangan (.json).', 'success');
    } catch (err) {
      App.showToast('Backup Gagal', 'Terjadi kesalahan saat mengekspor: ' + err.message, 'danger');
    }
  },

  /**
   * Validasi & Parse file JSON Backup — mengembalikan objek info sebelum konfirmasi restore
   */
  parseImportJSON(file) {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error('Tidak ada file')); return; }
      if (!file.name.toLowerCase().endsWith('.json')) {
        App.showToast('Format Salah', 'Hanya file berformat .json yang dapat diimpor.', 'warning');
        reject(new Error('Bukan file JSON')); return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const requiredKeys = ['guru', 'profil_sekolah'];
          const missingKeys = requiredKeys.filter(k => !parsed[k]);
          if (missingKeys.length > 0) {
            App.showToast('File Tidak Valid', `Struktur database tidak valid. Kunci hilang: ${missingKeys.join(', ')}`, 'danger');
            reject(new Error('Struktur tidak valid')); return;
          }
          resolve({
            jumlahGuru: (parsed.guru || []).length,
            jumlahAbsensi: (parsed.absensi || []).length,
            jumlahPelatihan: (parsed.pelatihan || []).length,
            namaSekolah: (parsed.profil_sekolah || {}).nama_sekolah || '(tidak ada)',
            data: parsed
          });
        } catch (e) {
          App.showToast('Parsing Gagal', 'File JSON rusak atau tidak dapat dibaca: ' + e.message, 'danger');
          reject(e);
        }
      };
      reader.onerror = (e) => { App.showToast('Baca File Gagal', 'Tidak dapat membaca file.', 'danger'); reject(e); };
      reader.readAsText(file);
    });
  },

  /**
   * Eksekusi restore database dari parsed JSON data
   */
  commitImportJSON(parsedData) {
    const success = DB.importJSON(JSON.stringify(parsedData));
    if (success) {
      DB.logActivity('Restore Database', 'system', `Database dipulihkan dari backup JSON (${(parsedData.guru || []).length} guru)`);
      App.showToast('Restore Berhasil', 'Database berhasil dipulihkan dari cadangan. Memuat ulang...', 'success');
      setTimeout(() => location.reload(), 1200);
    } else {
      App.showToast('Restore Gagal', 'Gagal memulihkan database. Data tidak valid.', 'danger');
    }
  },

  /**
   * Unduh Template Excel Standar untuk Import Data Guru
   */
  downloadGuruTemplateExcel() {
    const templateData = [
      {
        'NUPTK': '1234567890123456',
        'NIP': '199001012020011001',
        'Nama Lengkap': 'Nama Guru Contoh',
        'Gelar Depan': 'Drs.',
        'Gelar Belakang': 'S.Pd.',
        'Jenis Kelamin': 'Laki-laki',
        'Tempat Lahir': 'Pamekasan',
        'Tanggal Lahir (YYYY-MM-DD)': '1990-05-15',
        'Agama': 'Islam',
        'Status Pernikahan': 'Menikah',
        'NIK': '3513051505900001',
        'No KK': '3513050101150001',
        'NPWP': '12.345.678.9-652.000',
        'No HP / WhatsApp': '081234567890',
        'Email': 'guru.contoh@guru.sd.belajar.id',
        'Alamat Jalan': 'Jl. Pendidikan No. 10',
        'RT/RW': '001/002',
        'Desa': 'Sumber Waru',
        'Kecamatan': 'Waru',
        'Kabupaten': 'Kabupaten Pamekasan',
        'Provinsi': 'Jawa Timur',
        'Kode Pos': '67291',
        'Status Kepegawaian (PNS/PPPK/Honorer Sekolah (BOS)/Honorer Daerah)': 'PNS',
        'Jabatan': 'Guru Kelas Fase A (Kelas 1)',
        'Pangkat Golongan': 'Penata Muda Tk. I, III/b',
        'TMT Pengangkatan (YYYY-MM-DD)': '2020-01-01',
        'Nomor SK': '813/100/426.202/2020'
      },
      {
        'NUPTK': '9876543210987654',
        'NIP': '-',
        'Nama Lengkap': 'Guru Honorer Contoh',
        'Gelar Depan': '',
        'Gelar Belakang': 'S.Pd.',
        'Jenis Kelamin': 'Perempuan',
        'Tempat Lahir': 'Pamekasan',
        'Tanggal Lahir (YYYY-MM-DD)': '1995-08-20',
        'Agama': 'Islam',
        'Status Pernikahan': 'Belum Menikah',
        'NIK': '3513056008950002',
        'No KK': '3513050101150002',
        'NPWP': '-',
        'No HP / WhatsApp': '085789123456',
        'Email': 'guru.honorer@sdnsumberwaru2.sch.id',
        'Alamat Jalan': 'Dusun Krajan',
        'RT/RW': '003/001',
        'Desa': 'Sumber Waru',
        'Kecamatan': 'Waru',
        'Kabupaten': 'Kabupaten Pamekasan',
        'Provinsi': 'Jawa Timur',
        'Kode Pos': '67291',
        'Status Kepegawaian (PNS/PPPK/Honorer Sekolah (BOS)/Honorer Daerah)': 'Honorer Sekolah (BOS)',
        'Jabatan': 'Guru PJOK',
        'Pangkat Golongan': 'Guru Honorer',
        'TMT Pengangkatan (YYYY-MM-DD)': '2022-07-15',
        'Nomor SK': '421.2/015/SDN.SW2/2022'
      }
    ];

    this.exportToExcel(templateData, 'Template_Import_Data_Guru_SDN_Sumber_Waru_2', 'Template Guru');
  },

  /**
   * Baca file Excel / CSV dari input file dan konversi ke Array JSON
   */
  async readExcelFile(file) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof XLSX === 'undefined') {
          reject(new Error('Library SheetJS belum dimuat!'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
            resolve(jsonData);
          } catch (err) { reject(err); }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      } catch (err) { reject(err); }
    });
  },

  /**
   * Generate Full Relational SQL Dump Script from Current Database State
   */
  generateSQLDump(state) {
    const s = state || DB.state;
    const now = new Date().toISOString();

    let sql = `-- ============================================================================\n`;
    sql += `-- DATABASE DUMP: APLIKASI DATABASE GURU SD NEGERI SUMBER WARU 2\n`;
    sql += `-- Generated At: ${now}\n`;
    sql += `-- Target: PostgreSQL / MySQL Database\n`;
    sql += `-- ============================================================================\n\n`;

    const escapeSQL = (val) => {
      if (val === null || val === undefined) return 'NULL';
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // 1. Profil Sekolah
    if (s.profil_sekolah) {
      const ps = s.profil_sekolah;
      sql += `-- 1. DATA PROFIL SEKOLAH\n`;
      sql += `INSERT INTO profil_sekolah (npsn, nss, nama_sekolah, status_sekolah, akreditasi, alamat_lengkap, desa_kelurahan, kecamatan, kabupaten_kota, provinsi, kode_pos, telepon, email, nama_kepala_sekolah, nip_kepala_sekolah)\n`;
      sql += `VALUES (${escapeSQL(ps.npsn)}, ${escapeSQL(ps.nss)}, ${escapeSQL(ps.nama_sekolah)}, ${escapeSQL(ps.status_sekolah)}, ${escapeSQL(ps.akreditasi)}, ${escapeSQL(ps.alamat_lengkap)}, ${escapeSQL(ps.desa_kelurahan)}, ${escapeSQL(ps.kecamatan)}, ${escapeSQL(ps.kabupaten_kota)}, ${escapeSQL(ps.provinsi)}, ${escapeSQL(ps.kode_pos)}, ${escapeSQL(ps.telepon)}, ${escapeSQL(ps.email)}, ${escapeSQL(ps.nama_kepala_sekolah)}, ${escapeSQL(ps.nip_kepala_sekolah)});\n\n`;
    }

    // 2. Users
    if (s.users && s.users.length > 0) {
      sql += `-- 2. DATA USERS\n`;
      s.users.forEach(u => {
        sql += `INSERT INTO users (id, username, password_hash, nama_lengkap, email, role) VALUES (${u.id}, ${escapeSQL(u.username)}, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', ${escapeSQL(u.nama_lengkap)}, ${escapeSQL(u.email)}, ${escapeSQL(u.role)});\n`;
      });
      sql += `\n`;
    }

    // 3. Guru
    if (s.guru && s.guru.length > 0) {
      sql += `-- 3. DATA MASTER GURU\n`;
      s.guru.forEach(g => {
        sql += `INSERT INTO guru (id, nuptk, nip, nama_lengkap, gelar_depan, gelar_belakang, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, status_pernikahan, nik, no_kk, npwp, alamat_jalan, rt_rw, desa_kelurahan, kecamatan, kabupaten_kota, provinsi, kode_pos, no_hp, email, status_keaktifan)\n`;
        sql += `VALUES (${g.id}, ${escapeSQL(g.nuptk)}, ${escapeSQL(g.nip)}, ${escapeSQL(g.nama_lengkap)}, ${escapeSQL(g.gelar_depan)}, ${escapeSQL(g.gelar_belakang)}, ${escapeSQL(g.jenis_kelamin)}, ${escapeSQL(g.tempat_lahir)}, ${escapeSQL(g.tanggal_lahir)}, ${escapeSQL(g.agama)}, ${escapeSQL(g.status_pernikahan)}, ${escapeSQL(g.nik)}, ${escapeSQL(g.no_kk)}, ${escapeSQL(g.npwp)}, ${escapeSQL(g.alamat_jalan)}, ${escapeSQL(g.rt_rw)}, ${escapeSQL(g.desa_kelurahan)}, ${escapeSQL(g.kecamatan)}, ${escapeSQL(g.kabupaten_kota)}, ${escapeSQL(g.provinsi)}, ${escapeSQL(g.kode_pos)}, ${escapeSQL(g.no_hp)}, ${escapeSQL(g.email)}, ${escapeSQL(g.status_keaktifan)});\n`;
      });
      sql += `\n`;
    }

    // 4. Kepegawaian
    if (s.kepegawaian && s.kepegawaian.length > 0) {
      sql += `-- 4. DATA KEPEGAWAIAN\n`;
      s.kepegawaian.forEach(k => {
        sql += `INSERT INTO kepegawaian (id, guru_id, status_kepegawaian, jabatan, pangkat_golongan, tmt_pengangkatan, nomor_sk, instansi, unit_kerja)\n`;
        sql += `VALUES (${k.id}, ${k.guru_id}, ${escapeSQL(k.status_kepegawaian)}, ${escapeSQL(k.jabatan)}, ${escapeSQL(k.pangkat_golongan)}, ${escapeSQL(k.tmt_pengangkatan)}, ${escapeSQL(k.nomor_sk)}, ${escapeSQL(k.instansi || 'Dinas Pendidikan')}, ${escapeSQL(k.unit_kerja || 'SD Negeri Sumber Waru 2')});\n`;
      });
      sql += `\n`;
    }

    // 5. Pendidikan
    if (s.pendidikan && s.pendidikan.length > 0) {
      sql += `-- 5. DATA PENDIDIKAN\n`;
      s.pendidikan.forEach(p => {
        sql += `INSERT INTO pendidikan (id, guru_id, jenjang, nama_institusi, program_studi, tahun_masuk, tahun_lulus, ipk, nomor_ijazah)\n`;
        sql += `VALUES (${p.id}, ${p.guru_id}, ${escapeSQL(p.jenjang)}, ${escapeSQL(p.nama_institusi)}, ${escapeSQL(p.program_studi)}, ${p.tahun_masuk || 2015}, ${p.tahun_lulus || 2019}, ${p.ipk || 3.5}, ${escapeSQL(p.nomor_ijazah)});\n`;
      });
      sql += `\n`;
    }

    // 6. Sertifikasi
    if (s.sertifikasi && s.sertifikasi.length > 0) {
      sql += `-- 6. DATA SERTIFIKASI\n`;
      s.sertifikasi.forEach(st => {
        sql += `INSERT INTO sertifikasi (id, guru_id, nomor_sertifikat, bidang_studi, tahun_sertifikasi, lptk_penyelenggara, nomor_registrasi_guru, status_berlaku)\n`;
        sql += `VALUES (${st.id}, ${st.guru_id}, ${escapeSQL(st.nomor_sertifikat)}, ${escapeSQL(st.bidang_studi)}, ${st.tahun_sertifikasi || 2020}, ${escapeSQL(st.lptk_penyelenggara)}, ${escapeSQL(st.nomor_registrasi_guru)}, ${escapeSQL(st.status_berlaku)});\n`;
      });
      sql += `\n`;
    }

    // 7. Jadwal Mengajar
    if (s.jadwal_mengajar && s.jadwal_mengajar.length > 0) {
      sql += `-- 7. DATA JADWAL MENGAJAR\n`;
      s.jadwal_mengajar.forEach(j => {
        sql += `INSERT INTO jadwal_mengajar (id, guru_id, hari, jam_ke, waktu_mulai, waktu_selesai, kelas, mata_pelajaran, ruangan, jumlah_jp)\n`;
        sql += `VALUES (${j.id}, ${j.guru_id}, ${escapeSQL(j.hari)}, ${escapeSQL(j.jam_ke)}, ${escapeSQL(j.waktu_mulai)}, ${escapeSQL(j.waktu_selesai)}, ${escapeSQL(j.kelas)}, ${escapeSQL(j.mata_pelajaran)}, ${escapeSQL(j.ruangan)}, ${j.jumlah_jp || 2});\n`;
      });
      sql += `\n`;
    }

    // 8. Beban Mengajar
    if (s.beban_mengajar && s.beban_mengajar.length > 0) {
      sql += `-- 8. DATA BEBAN MENGAJAR (24 JP)\n`;
      s.beban_mengajar.forEach(b => {
        sql += `INSERT INTO beban_mengajar (id, guru_id, jp_tatap_muka, tugas_tambahan, jp_tugas_tambahan, ekstrakurikuler, jp_ekskul, keterangan)\n`;
        sql += `VALUES (${b.id}, ${b.guru_id}, ${b.jp_tatap_muka || 24}, ${escapeSQL(b.tugas_tambahan)}, ${b.jp_tugas_tambahan || 0}, ${escapeSQL(b.ekstrakurikuler)}, ${b.jp_ekskul || 0}, ${escapeSQL(b.keterangan)});\n`;
      });
      sql += `\n`;
    }

    // 9. Absensi
    if (s.absensi && s.absensi.length > 0) {
      sql += `-- 9. DATA ABSENSI PRESENSI\n`;
      s.absensi.forEach(a => {
        sql += `INSERT INTO absensi (id, guru_id, tanggal, waktu_masuk, waktu_pulang, status_kehadiran, keterangan)\n`;
        sql += `VALUES (${a.id}, ${a.guru_id}, ${escapeSQL(a.tanggal)}, ${escapeSQL(a.waktu_masuk)}, ${escapeSQL(a.waktu_pulang)}, ${escapeSQL(a.status_kehadiran)}, ${escapeSQL(a.keterangan)});\n`;
      });
      sql += `\n`;
    }

    // 10. PKG
    if (s.pkg && s.pkg.length > 0) {
      sql += `-- 10. DATA PENILAIAN KINERJA GURU (PKG)\n`;
      s.pkg.forEach(pk => {
        sql += `INSERT INTO pkg (id, guru_id, tahun_penilaian, skor_perencanaan, skor_pelaksanaan, skor_evaluasi, skor_profesionalisme, skor_kehadiran, nilai_akhir, predikat, nama_penilai, catatan_rekomendasi)\n`;
        sql += `VALUES (${pk.id}, ${pk.guru_id}, ${pk.tahun_penilaian || 2026}, ${pk.skor_perencanaan || 85}, ${pk.skor_pelaksanaan || 85}, ${pk.skor_evaluasi || 85}, ${pk.skor_profesionalisme || 85}, ${pk.skor_kehadiran || 85}, ${pk.nilai_akhir || 85}, ${escapeSQL(pk.predikat)}, ${escapeSQL(pk.nama_penilai)}, ${escapeSQL(pk.catatan_rekomendasi)});\n`;
      });
      sql += `\n`;
    }

    // 11. Prestasi
    if (s.prestasi && s.prestasi.length > 0) {
      sql += `-- 11. DATA PRESTASI\n`;
      s.prestasi.forEach(pr => {
        sql += `INSERT INTO prestasi (id, guru_id, kategori, nama_prestasi, tingkat, peringkat_juara, tahun, penyelenggara, nomor_piagam)\n`;
        sql += `VALUES (${pr.id}, ${pr.guru_id}, ${escapeSQL(pr.kategori)}, ${escapeSQL(pr.nama_prestasi)}, ${escapeSQL(pr.tingkat)}, ${escapeSQL(pr.peringkat_juara)}, ${pr.tahun || 2024}, ${escapeSQL(pr.penyelenggara)}, ${escapeSQL(pr.nomor_piagam)});\n`;
      });
      sql += `\n`;
    }

    // 12. Pelatihan
    if (s.pelatihan && s.pelatihan.length > 0) {
      sql += `-- 12. DATA PELATIHAN PMM & DIKLAT\n`;
      s.pelatihan.forEach(pl => {
        sql += `INSERT INTO pelatihan (id, guru_id, nama_pelatihan, jenis_pelatihan, penyelenggara, pola_jp, tanggal_mulai, tanggal_selesai, tahun, nomor_sertifikat)\n`;
        sql += `VALUES (${pl.id}, ${pl.guru_id}, ${escapeSQL(pl.nama_pelatihan)}, ${escapeSQL(pl.jenis_pelatihan)}, ${escapeSQL(pl.penyelenggara)}, ${pl.pola_jp || 32}, ${escapeSQL(pl.tanggal_mulai)}, ${escapeSQL(pl.tanggal_selesai)}, ${pl.tahun || 2024}, ${escapeSQL(pl.nomor_sertifikat)});\n`;
      });
      sql += `\n`;
    }

    // 13. Dokumen
    if (s.dokumen && s.dokumen.length > 0) {
      sql += `-- 13. DATA DOKUMEN DIGITAL (E-ARSIP)\n`;
      s.dokumen.forEach(d => {
        sql += `INSERT INTO dokumen (id, guru_id, kategori_dokumen, nama_dokumen, nomor_dokumen, tanggal_terbit, tanggal_kadaluarsa, file_url, ukuran_file_kb)\n`;
        sql += `VALUES (${d.id}, ${d.guru_id}, ${escapeSQL(d.kategori_dokumen)}, ${escapeSQL(d.nama_dokumen)}, ${escapeSQL(d.nomor_dokumen)}, ${escapeSQL(d.tanggal_terbit)}, ${escapeSQL(d.tanggal_kadaluarsa)}, ${escapeSQL(d.file_url || '#')}, ${d.ukuran_file_kb || 350});\n`;
      });
      sql += `\n`;
    }

    return sql;
  },

  /**
   * Unduh file SQL Dump langsung
   */
  downloadSQLDump() {
    try {
      const sqlContent = this.generateSQLDump();
      const blob = new Blob([sqlContent], { type: 'text/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DATABASE_DUMP_SDN_SUMBER_WARU_2_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      DB.logActivity('Export SQL Dump', 'system', 'Database diekspor sebagai SQL Dump');
      App.showToast('SQL Dump Berhasil', 'Skrip SQL DDL & INSERT berhasil diunduh.', 'success');
    } catch (err) {
      console.error('Gagal mengekspor SQL:', err);
      App.showToast('SQL Dump Gagal', 'Terjadi kesalahan: ' + err.message, 'danger');
    }
  },

  /**
   * Render QR Code ke elemen DOM menggunakan library QRCode.js
   */
  renderQRCode(elementId, text, size = 128) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
      new QRCode(el, {
        text: text,
        width: size,
        height: size,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      el.innerHTML = `<div class="p-2 text-center text-muted" style="font-size:10px;">QR: ${text}</div>`;
    }
  },

  /**
   * Cetak atau unduh elemen sebagai gambar PNG menggunakan html2canvas
   */
  async downloadElementAsImage(elementId, filename) {
    const el = document.getElementById(elementId);
    if (!el) {
      App.showToast('Elemen Tidak Ditemukan', 'Tidak dapat menemukan elemen yang akan diekspor.', 'danger');
      return;
    }
    try {
      if (typeof html2canvas === 'undefined') { window.print(); return; }
      App.showToast('Memproses...', 'Sedang menghasilkan gambar, mohon tunggu.', 'info');
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      App.showToast('Gambar Berhasil', `${filename}.png berhasil diunduh.`, 'success');
    } catch (err) {
      console.error('Gagal mengonversi ke gambar:', err);
      App.showToast('Gagal Ekspor Gambar', 'Mencoba fungsi Print sebagai alternatif...', 'warning');
      window.print();
    }
  },

  /**
   * Ekspor dokumen ke PDF menggunakan jsPDF & html2canvas
   */
  async exportElementToPDF(elementId, filename, orientation = 'portrait') {
    const el = document.getElementById(elementId);
    if (!el) return;
    try {
      if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') { window.print(); return; }
      App.showToast('Memproses PDF...', 'Sedang menghasilkan PDF, mohon tunggu.', 'info');
      const { jsPDF } = window.jspdf;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF(orientation, 'mm', 'a4');
      const imgWidth = orientation === 'portrait' ? 210 : 297;
      const pageHeight = orientation === 'portrait' ? 297 : 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
      App.showToast('PDF Berhasil', `${filename}.pdf berhasil diunduh.`, 'success');
    } catch (err) {
      console.error('Gagal mengekspor PDF:', err);
      App.showToast('PDF Gagal', 'Mencoba fungsi Print sebagai alternatif...', 'warning');
      window.print();
    }
  }
};
