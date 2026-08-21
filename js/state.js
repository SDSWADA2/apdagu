/**
 * ============================================================================
 * STATE MANAGEMENT & DATABASE ENGINE LENGKAP
 * APLIKASI DATABASE GURU SD NEGERI SUMBER WARU 2 (KAB. PAMEKASAN)
 * ============================================================================
 */

const APP_STORAGE_KEY = 'SDN_SUMBER_WARU_2_GURU_DB_v2';

// Seed Avatar Generator (SVG Data URI)
function generateAvatar(name, bg = '#2563eb') {
  const initials = typeof Helpers !== 'undefined' ? Helpers.getInitials(name) : (name ? name.slice(0, 2).toUpperCase() : 'SD');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="${bg}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="46" font-weight="700">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Sample Digital Signature SVG
const DEFAULT_SIGNATURE = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">
    <path d="M 20,50 Q 50,10 70,45 T 120,40 Q 150,65 180,30" stroke="#0f172a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 60,60 Q 100,55 160,60" stroke="#0f172a" stroke-width="2" fill="none"/>
  </svg>
`);

// ============================================================================
// DATA AWAL DATABASE RESMI (SD NEGERI SUMBER WARU 2)
// ============================================================================
const INITIAL_STATE = {
  profil_sekolah: {
    npsn: '20527136',
    nss: '101052610041',
    nama_sekolah: 'SD NEGERI SUMBER WARU 2',
    status_sekolah: 'Negeri',
    bentuk_pendidikan: 'Sekolah Dasar (SD)',
    akreditasi: 'B (Baik)',
    alamat_lengkap: 'Jln 2, Sumber Waru 1, Sumber Waru, Kec. Waru, Kabupaten Pamekasan, Jawa Timur',
    desa_kelurahan: 'Sumber Waru',
    kecamatan: 'Waru',
    kabupaten_kota: 'Kabupaten Pamekasan',
    provinsi: 'Jawa Timur',
    kode_pos: '69353',
    telepon: '081953812155',
    email: 'sdnegerisumberwaru2official@gmail.com',
    website: 'https://sdnsumberwaru2.sch.id',
    nama_kepala_sekolah: 'FAUZAN, S.Pd.SD',
    nip_kepala_sekolah: '19720602 199605 1 001',
    stempel_url: '',
    logo_url: ''
  },

  pengaturan_aplikasi: {
    logo_sekolah: '',
    ttd_kepala_sekolah: '',
    warna_utama_aplikasi: '#2563eb',
    warna_tema_idcard: '#0f172a'
  },

  konfigurasi_sistem: {
    timezone: 'Asia/Jakarta',
    format: 'DD MMMM YYYY',
    language: 'id',
    timeout: 60,
    security: {
      strong_password: true,
      force_logout: true,
      api_lock: false
    }
  },

  integrasi: {
    smtp: {
      host: '',
      port: '',
      sec: 'ssl',
      user: ''
    },
    wa: {
      url: '',
      active: false
    }
  },

  pengaturan_absensi: {
    jam_masuk: '07:00',
    jam_toleransi: '07:15',
    jam_pulang_reguler: '14:30',
    jam_pulang_jumat: '11:30',
    jam_pulang_sabtu: '13:00',
    hari_kerja: 6
  },
  
  users: [
    {
      id: 1,
      username: 'admin',
      password: 'admin123',
      nama_lengkap: 'Administrator Utama (KS)',
      email: 'admin@sdnsumberwaru2.sch.id',
      role: 'admin',
      status: 'aktif',
      foto_url: generateAvatar('Admin Utama', '#1e3a8a')
    },
    {
      id: 2,
      username: 'operator',
      password: 'operator123',
      nama_lengkap: 'Ahmad Fauzi (Operator Dapodik)',
      email: 'operator@sdnsumberwaru2.sch.id',
      role: 'operator',
      status: 'aktif',
      guru_id: 6,
      foto_url: generateAvatar('Ahmad Fauzi', '#10b981')
    },
    {
      id: 3,
      username: 'guru1',
      password: 'guru123',
      nama_lengkap: 'Siti Rahmawati, S.Pd., Gr.',
      email: 'siti.rahma@sdnsumberwaru2.sch.id',
      role: 'guru',
      status: 'aktif',
      guru_id: 2,
      foto_url: generateAvatar('Siti Rahmawati', '#2563eb')
    },
    {
      id: 4,
      username: 'guru2',
      password: 'guru123',
      nama_lengkap: 'Budi Santoso, S.Pd.',
      email: 'budi.santoso@sdnsumberwaru2.sch.id',
      role: 'guru',
      status: 'aktif',
      guru_id: 3,
      foto_url: generateAvatar('Budi Santoso', '#7c3aed')
    }
  ],

  guru: [
    {
      id: 1,
      nuptk: '3445746648200032',
      nip: '19720602 199605 1 001',
      nama_lengkap: 'Abdul Adim',
      gelar_depan: '',
      gelar_belakang: 'S.Pd.SD.',
      jenis_kelamin: 'Laki-laki',
      tempat_lahir: 'Pamekasan',
      tanggal_lahir: '1968-05-12',
      agama: 'Islam',
      status_pernikahan: 'Menikah',
      nik: '3513051205680001',
      no_kk: '3513051001080005',
      npwp: '08.123.456.7-652.000',
      alamat_jalan: 'Jl. Raya Waru No. 12',
      rt_rw: '002/001',
      desa_kelurahan: 'Sumber Waru',
      kecamatan: 'Waru',
      kabupaten_kota: 'Kabupaten Pamekasan',
      provinsi: 'Jawa Timur',
      kode_pos: '67291',
      no_hp: '081234567890',
      email: 'bambang.sutrisno@guru.sd.belajar.id',
      foto_url: generateAvatar('Abdul Adim', '#1e3a8a'),
      tanda_tangan_url: DEFAULT_SIGNATURE,
      status_keaktifan: 'Aktif'
    },
    {
      id: 2,
      nuptk: '8956758660300021',
      nip: '198504142009022003',
      nama_lengkap: 'Siti Rahmawati',
      gelar_depan: '',
      gelar_belakang: 'S.Pd., Gr.',
      jenis_kelamin: 'Perempuan',
      tempat_lahir: 'Pamekasan',
      tanggal_lahir: '1985-04-14',
      agama: 'Islam',
      status_pernikahan: 'Menikah',
      nik: '3513055404850002',
      no_kk: '3513051202100003',
      npwp: '45.789.123.4-652.000',
      alamat_jalan: 'Jl. Merpati Indah Blok C No. 4',
      rt_rw: '004/002',
      desa_kelurahan: 'Klenang Lor',
      kecamatan: 'Waru',
      kabupaten_kota: 'Kabupaten Pamekasan',
      provinsi: 'Jawa Timur',
      kode_pos: '67291',
      no_hp: '082198765432',
      email: 'siti.rahmawati@guru.sd.belajar.id',
      foto_url: generateAvatar('Siti Rahmawati', '#2563eb'),
      tanda_tangan_url: DEFAULT_SIGNATURE,
      status_keaktifan: 'Aktif'
    },
    {
      id: 3,
      nuptk: '1234762663200054',
      nip: '199008202019031008',
      nama_lengkap: 'Rahmat Hidayat',
      gelar_depan: '',
      gelar_belakang: 'S.Pd.SD',
      jenis_kelamin: 'Laki-laki',
      tempat_lahir: 'Kraksaan',
      tanggal_lahir: '1990-08-20',
      agama: 'Islam',
      status_pernikahan: 'Menikah',
      nik: '3513102008900004',
      no_kk: '3513101509150002',
      npwp: '56.890.234.5-652.000',
      alamat_jalan: 'Dusun Krajan RT 01 RW 01',
      rt_rw: '001/001',
      desa_kelurahan: 'Sumber Waru',
      kecamatan: 'Waru',
      kabupaten_kota: 'Kabupaten Pamekasan',
      provinsi: 'Jawa Timur',
      kode_pos: '67291',
      no_hp: '085234567891',
      email: 'rahmat.hidayat@guru.sd.belajar.id',
      foto_url: generateAvatar('Rahmat Hidayat', '#059669'),
      tanda_tangan_url: DEFAULT_SIGNATURE,
      status_keaktifan: 'Aktif'
    },
    {
      id: 4,
      nuptk: '5678768670210033',
      nip: '199211052023212015',
      nama_lengkap: 'Dewi Anggraini',
      gelar_depan: '',
      gelar_belakang: 'S.Pd., Gr.',
      jenis_kelamin: 'Perempuan',
      tempat_lahir: 'Pamekasan',
      tanggal_lahir: '1992-11-05',
      agama: 'Islam',
      status_pernikahan: 'Menikah',
      nik: '3513054511920003',
      no_kk: '3513051010180004',
      npwp: '67.901.345.6-652.000',
      alamat_jalan: 'Jl. Melati Putih No. 19',
      rt_rw: '003/001',
      desa_kelurahan: 'Tarokan',
      kecamatan: 'Waru',
      kabupaten_kota: 'Kabupaten Pamekasan',
      provinsi: 'Jawa Timur',
      kode_pos: '67291',
      no_hp: '081398761234',
      email: 'dewi.anggraini@guru.sd.belajar.id',
      foto_url: generateAvatar('Dewi Anggraini', '#ec4899'),
      tanda_tangan_url: DEFAULT_SIGNATURE,
      status_keaktifan: 'Aktif'
    },
    {
      id: 5,
      nuptk: '2345750652200012',
      nip: '197906152008011011',
      nama_lengkap: 'Muhammad Ridwan',
      gelar_depan: '',
      gelar_belakang: 'S.Pd.I, M.Pd.',
      jenis_kelamin: 'Laki-laki',
      tempat_lahir: 'Gending',
      tanggal_lahir: '1979-06-15',
      agama: 'Islam',
      status_pernikahan: 'Menikah',
      nik: '3513041506790001',
      no_kk: '3513042005050002',
      npwp: '78.012.456.7-652.000',
      alamat_jalan: 'Jl. Pesantren No. 08',
      rt_rw: '002/003',
      desa_kelurahan: 'Sumber Waru',
      kecamatan: 'Waru',
      kabupaten_kota: 'Kabupaten Pamekasan',
      provinsi: 'Jawa Timur',
      kode_pos: '67291',
      no_hp: '082234567899',
      email: 'm.ridwan@guru.sd.belajar.id',
      foto_url: generateAvatar('Muhammad Ridwan', '#0284c7'),
      tanda_tangan_url: DEFAULT_SIGNATURE,
      status_keaktifan: 'Aktif'
    },
    {
      id: 6,
      nuptk: '9012771672130098',
      nip: '199503182024211002',
      nama_lengkap: 'Ahmad Fauzi',
      gelar_depan: '',
      gelar_belakang: 'S.Pd.',
      jenis_kelamin: 'Laki-laki',
      tempat_lahir: 'Pamekasan',
      tanggal_lahir: '1995-03-18',
      agama: 'Islam',
      status_pernikahan: 'Belum Menikah',
      nik: '3513051803950005',
      no_kk: '3513050101150007',
      npwp: '89.123.567.8-652.000',
      alamat_jalan: 'Dusun Tengah RT 02 RW 01',
      rt_rw: '002/001',
      desa_kelurahan: 'Alassapi',
      kecamatan: 'Waru',
      kabupaten_kota: 'Kabupaten Pamekasan',
      provinsi: 'Jawa Timur',
      kode_pos: '67291',
      no_hp: '087756789012',
      email: 'ahmad.fauzi@guru.sd.belajar.id',
      foto_url: generateAvatar('Ahmad Fauzi', '#10b981'),
      tanda_tangan_url: DEFAULT_SIGNATURE,
      status_keaktifan: 'Aktif'
    },
    {
      id: 7,
      nuptk: '6789774675230044',
      nip: '-',
      nama_lengkap: 'Tri Wahyuni',
      gelar_depan: '',
      gelar_belakang: 'S.Pd.',
      jenis_kelamin: 'Perempuan',
      tempat_lahir: 'Pamekasan',
      tanggal_lahir: '1997-09-10',
      agama: 'Islam',
      status_pernikahan: 'Menikah',
      nik: '3513055009970001',
      no_kk: '3513051511200003',
      npwp: '-',
      alamat_jalan: 'Jl. Lapangan Olahraga No. 05',
      rt_rw: '001/002',
      desa_kelurahan: 'Sumber Waru',
      kecamatan: 'Waru',
      kabupaten_kota: 'Kabupaten Pamekasan',
      provinsi: 'Jawa Timur',
      kode_pos: '67291',
      no_hp: '089678123456',
      email: 'tri.wahyuni@sdnsumberwaru2.sch.id',
      foto_url: generateAvatar('Tri Wahyuni', '#f59e0b'),
      tanda_tangan_url: DEFAULT_SIGNATURE,
      status_keaktifan: 'Aktif'
    },
    {
      id: 8,
      nuptk: '7890776677230055',
      nip: '-',
      nama_lengkap: 'Nurul Hidayati',
      gelar_depan: '',
      gelar_belakang: 'S.Pd.',
      jenis_kelamin: 'Perempuan',
      tempat_lahir: 'Maron',
      tanggal_lahir: '1998-12-25',
      agama: 'Islam',
      status_pernikahan: 'Belum Menikah',
      nik: '3513086512980002',
      no_kk: '3513080101180006',
      npwp: '-',
      alamat_jalan: 'Dusun Selatan RT 03 RW 02',
      rt_rw: '003/002',
      desa_kelurahan: 'Sumber Waru',
      kecamatan: 'Waru',
      kabupaten_kota: 'Kabupaten Pamekasan',
      provinsi: 'Jawa Timur',
      kode_pos: '67291',
      no_hp: '083812345098',
      email: 'nurul.hidayati@sdnsumberwaru2.sch.id',
      foto_url: generateAvatar('Nurul Hidayati', '#8b5cf6'),
      tanda_tangan_url: DEFAULT_SIGNATURE,
      status_keaktifan: 'Aktif'
    }
  ],

  kepegawaian: [
    {
      id: 1,
      guru_id: 1,
      status_kepegawaian: 'PNS',
      jabatan: 'Kepala Sekolah',
      pangkat_golongan: 'Pembina Utama Muda (IV/c)',
      tmt_pengangkatan: '1992-03-01',
      sk_pengangkatan: 'SK Bupati Pamekasan',
      nomor_sk: '821.2/145/426.202/2021',
      pejabat_pengangkat: 'Bupati Pamekasan',
      gaji_pokok: 5200000,
      instansi: 'Dinas Pendidikan Kab. Pamekasan',
      unit_kerja: 'SD Negeri Sumber Waru 2'
    },
    {
      id: 2,
      guru_id: 2,
      status_kepegawaian: 'PNS',
      jabatan: 'Guru Kelas Fase C (Kelas 6)',
      pangkat_golongan: 'Penata Tk. I (III/d)',
      tmt_pengangkatan: '2009-02-01',
      sk_pengangkatan: 'SK CPNS Bupati',
      nomor_sk: '813/089/426.202/2009',
      pejabat_pengangkat: 'Bupati Pamekasan',
      gaji_pokok: 4100000,
      instansi: 'Dinas Pendidikan Kab. Pamekasan',
      unit_kerja: 'SD Negeri Sumber Waru 2'
    },
    {
      id: 3,
      guru_id: 3,
      status_kepegawaian: 'PNS',
      jabatan: 'Guru Kelas Fase B (Kelas 4)',
      pangkat_golongan: 'Penata Muda Tk. I (III/b)',
      tmt_pengangkatan: '2019-03-01',
      sk_pengangkatan: 'SK CPNS',
      nomor_sk: '813/210/426.202/2019',
      pejabat_pengangkat: 'Bupati Pamekasan',
      gaji_pokok: 3400000,
      instansi: 'Dinas Pendidikan Kab. Pamekasan',
      unit_kerja: 'SD Negeri Sumber Waru 2'
    },
    {
      id: 4,
      guru_id: 4,
      status_kepegawaian: 'PPPK',
      jabatan: 'Guru Kelas Fase A (Kelas 1)',
      pangkat_golongan: 'Golongan IX (PPPK)',
      tmt_pengangkatan: '2023-06-01',
      sk_pengangkatan: 'SK Pengangkatan PPPK',
      nomor_sk: '810/345/426.202/2023',
      pejabat_pengangkat: 'Bupati Pamekasan',
      gaji_pokok: 3200000,
      instansi: 'Dinas Pendidikan Kab. Pamekasan',
      unit_kerja: 'SD Negeri Sumber Waru 2'
    },
    {
      id: 5,
      guru_id: 5,
      status_kepegawaian: 'PNS',
      jabatan: 'Guru Pendidikan Agama Islam (PAI)',
      pangkat_golongan: 'Penata (III/c)',
      tmt_pengangkatan: '2008-01-01',
      sk_pengangkatan: 'SK Kemenag / Pemkab',
      nomor_sk: '813/045/426.202/2008',
      pejabat_pengangkat: 'Bupati Pamekasan',
      gaji_pokok: 3800000,
      instansi: 'Dinas Pendidikan Kab. Pamekasan',
      unit_kerja: 'SD Negeri Sumber Waru 2'
    },
    {
      id: 6,
      guru_id: 6,
      status_kepegawaian: 'PPPK',
      jabatan: 'Guru Kelas Fase B (Kelas 3)',
      pangkat_golongan: 'Golongan IX (PPPK)',
      tmt_pengangkatan: '2024-03-01',
      sk_pengangkatan: 'SK PPPK Guru',
      nomor_sk: '810/112/426.202/2024',
      pejabat_pengangkat: 'Bupati Pamekasan',
      gaji_pokok: 3200000,
      instansi: 'Dinas Pendidikan Kab. Pamekasan',
      unit_kerja: 'SD Negeri Sumber Waru 2'
    },
    {
      id: 7,
      guru_id: 7,
      status_kepegawaian: 'Honorer Sekolah (BOS)',
      jabatan: 'Guru PJOK',
      pangkat_golongan: '-',
      tmt_pengangkatan: '2020-07-15',
      sk_pengangkatan: 'SK Kepala Sekolah',
      nomor_sk: '421.2/025/SDN.SW2/2020',
      pejabat_pengangkat: 'Kepala SD Negeri Sumber Waru 2',
      gaji_pokok: 1200000,
      instansi: 'SD Negeri Sumber Waru 2',
      unit_kerja: 'SD Negeri Sumber Waru 2'
    },
    {
      id: 8,
      guru_id: 8,
      status_kepegawaian: 'Honorer Sekolah (BOS)',
      jabatan: 'Guru Kelas Fase A (Kelas 2)',
      pangkat_golongan: '-',
      tmt_pengangkatan: '2021-08-01',
      sk_pengangkatan: 'SK Kepala Sekolah',
      nomor_sk: '421.2/031/SDN.SW2/2021',
      pejabat_pengangkat: 'Kepala SD Negeri Sumber Waru 2',
      gaji_pokok: 1200000,
      instansi: 'SD Negeri Sumber Waru 2',
      unit_kerja: 'SD Negeri Sumber Waru 2'
    }
  ],

  pendidikan: [
    { id: 1, guru_id: 1, jenjang: 'S1', nama_institusi: 'IKIP Malang (Universitas Negeri Malang)', program_studi: 'Pendidikan Bahasa & Sastra Indonesia', tahun_masuk: 1987, tahun_lulus: 1991, ipk: 3.45, nomor_ijazah: 'IKIP-MLG/1991/78912' },
    { id: 2, guru_id: 1, jenjang: 'S2', nama_institusi: 'Universitas Negeri Surabaya (UNESA)', program_studi: 'Manajemen Pendidikan', tahun_masuk: 2005, tahun_lulus: 2008, ipk: 3.82, nomor_ijazah: 'UNESA/S2/2008/00456' },
    { id: 3, guru_id: 2, jenjang: 'S1', nama_institusi: 'Universitas Jember (UNEJ)', program_studi: 'Pendidikan Guru Sekolah Dasar (PGSD)', tahun_masuk: 2003, tahun_lulus: 2007, ipk: 3.75, nomor_ijazah: 'UNEJ/FKIP/2007/11245' },
    { id: 4, guru_id: 3, jenjang: 'S1', nama_institusi: 'Universitas Terbuka (UPBJJ Jember)', program_studi: 'PGSD S1', tahun_masuk: 2008, tahun_lulus: 2013, ipk: 3.50, nomor_ijazah: 'UT/PGSD/2013/88901' },
    { id: 5, guru_id: 4, jenjang: 'S1', nama_institusi: 'Universitas PGRI Banyuwangi', program_studi: 'PGSD', tahun_masuk: 2011, tahun_lulus: 2015, ipk: 3.68, nomor_ijazah: 'UNIBA/2015/09871' },
    { id: 6, guru_id: 5, jenjang: 'S1', nama_institusi: 'IAIN Jember (UIN KHAS Jember)', program_studi: 'Pendidikan Agama Islam (Tarbiyah)', tahun_masuk: 1998, tahun_lulus: 2002, ipk: 3.60, nomor_ijazah: 'IAIN-JBR/2002/55678' },
    { id: 7, guru_id: 5, jenjang: 'S2', nama_institusi: 'UIN Sunan Ampel Surabaya', program_studi: 'Magister Pendidikan Islam (PAI)', tahun_masuk: 2016, tahun_lulus: 2019, ipk: 3.85, nomor_ijazah: 'UINSA/S2/PAI/2019/3321' },
    { id: 8, guru_id: 6, jenjang: 'S1', nama_institusi: 'Universitas Negeri Malang (UM)', program_studi: 'Pendidikan Informatika & PGSD', tahun_masuk: 2013, tahun_lulus: 2017, ipk: 3.80, nomor_ijazah: 'UM/FT/2017/33421' },
    { id: 9, guru_id: 7, jenjang: 'S1', nama_institusi: 'Universitas Negeri Surabaya (UNESA)', program_studi: 'Pendidikan Jasmani, Kesehatan & Rekreasi', tahun_masuk: 2015, tahun_lulus: 2019, ipk: 3.55, nomor_ijazah: 'UNESA/FIK/2019/77812' },
    { id: 10, guru_id: 8, jenjang: 'S1', nama_institusi: 'Universitas Islam Zainul Hasan Genggong', program_studi: 'PGMI / PGSD', tahun_masuk: 2016, tahun_lulus: 2020, ipk: 3.70, nomor_ijazah: 'UNZAH/2020/12098' }
  ],

  sertifikasi: [
    { id: 1, guru_id: 1, nomor_sertifikat: '1205120010045', bidang_studi: 'Manajemen Pendidikan / Kepala Sekolah', tahun_sertifikasi: 2008, lptk_penyelenggara: 'LPPKS / UNESA', nomor_registrasi_guru: 'NRG-081234567', status_berlaku: 'Aktif' },
    { id: 2, guru_id: 2, nomor_sertifikat: '2005020271018', bidang_studi: 'Guru Kelas SD (PGSD)', tahun_sertifikasi: 2014, lptk_penyelenggara: 'Universitas Jember', nomor_registrasi_guru: '14271018902', status_berlaku: 'Aktif' },
    { id: 3, guru_id: 3, nomor_sertifikat: '2105020271045', bidang_studi: 'Guru Kelas SD (PGSD)', tahun_sertifikasi: 2020, lptk_penyelenggara: 'Universitas Negeri Malang', nomor_registrasi_guru: '20271045881', status_berlaku: 'Aktif' },
    { id: 4, guru_id: 4, nomor_sertifikat: '2305020271099', bidang_studi: 'Guru Kelas SD (PGSD)', tahun_sertifikasi: 2023, lptk_penyelenggara: 'Universitas Negeri Surabaya', nomor_registrasi_guru: '23271099120', status_berlaku: 'Aktif' },
    { id: 5, guru_id: 5, nomor_sertifikat: '1505020271008', bidang_studi: 'Pendidikan Agama Islam (PAI)', tahun_sertifikasi: 2015, lptk_penyelenggara: 'UIN Sunan Ampel Surabaya', nomor_registrasi_guru: '15271008776', status_berlaku: 'Aktif' }
  ],

  jadwal_mengajar: [
    { id: 1, guru_id: 2, hari: 'Senin', jam_ke: '1 - 3', waktu_mulai: '07:00', waktu_selesai: '08:45', kelas: 'Kelas 6', mata_pelajaran: 'Pendidikan Pancasila', ruangan: 'Ruang Kelas 6', jumlah_jp: 3 },
    { id: 2, guru_id: 2, hari: 'Senin', jam_ke: '4 - 6', waktu_mulai: '09:05', waktu_selesai: '10:50', kelas: 'Kelas 6', mata_pelajaran: 'Bahasa Indonesia', ruangan: 'Ruang Kelas 6', jumlah_jp: 3 },
    { id: 3, guru_id: 2, hari: 'Selasa', jam_ke: '1 - 4', waktu_mulai: '07:00', waktu_selesai: '09:20', kelas: 'Kelas 6', mata_pelajaran: 'Matematika', ruangan: 'Ruang Kelas 6', jumlah_jp: 4 },
    { id: 4, guru_id: 3, hari: 'Senin', jam_ke: '1 - 3', waktu_mulai: '07:00', waktu_selesai: '08:45', kelas: 'Kelas 4', mata_pelajaran: 'Pendidikan Pancasila', ruangan: 'Ruang Kelas 4', jumlah_jp: 3 },
    { id: 5, guru_id: 3, hari: 'Rabu', jam_ke: '1 - 4', waktu_mulai: '07:00', waktu_selesai: '09:20', kelas: 'Kelas 4', mata_pelajaran: 'IPAS', ruangan: 'Ruang Kelas 4', jumlah_jp: 4 },
    { id: 6, guru_id: 4, hari: 'Senin', jam_ke: '1 - 3', waktu_mulai: '07:00', waktu_selesai: '08:45', kelas: 'Kelas 1', mata_pelajaran: 'Bahasa Indonesia', ruangan: 'Ruang Kelas 1', jumlah_jp: 3 },
    { id: 7, guru_id: 4, hari: 'Selasa', jam_ke: '1 - 3', waktu_mulai: '07:00', waktu_selesai: '08:45', kelas: 'Kelas 1', mata_pelajaran: 'Matematika', ruangan: 'Ruang Kelas 1', jumlah_jp: 3 },
    { id: 8, guru_id: 5, hari: 'Selasa', jam_ke: '1 - 3', waktu_mulai: '07:00', waktu_selesai: '08:45', kelas: 'Kelas 5', mata_pelajaran: 'Pendidikan Agama Islam dan Budi Pekerti', ruangan: 'Ruang Kelas 5', jumlah_jp: 3 },
    { id: 9, guru_id: 5, hari: 'Rabu', jam_ke: '1 - 3', waktu_mulai: '07:00', waktu_selesai: '08:45', kelas: 'Kelas 6', mata_pelajaran: 'Pendidikan Agama Islam dan Budi Pekerti', ruangan: 'Ruang Kelas 6', jumlah_jp: 3 },
    { id: 10, guru_id: 6, hari: 'Kamis', jam_ke: '1 - 4', waktu_mulai: '07:00', waktu_selesai: '09:20', kelas: 'Kelas 3', mata_pelajaran: 'Bahasa Indonesia', ruangan: 'Ruang Kelas 3', jumlah_jp: 4 },
    { id: 11, guru_id: 7, hari: 'Kamis', jam_ke: '1 - 4', waktu_mulai: '07:00', waktu_selesai: '09:20', kelas: 'Kelas 4 & 5', mata_pelajaran: 'Pendidikan Jasmani Olahraga dan Kesehatan (PJOK)', ruangan: 'Lapangan Olahraga', jumlah_jp: 4 },
    { id: 12, guru_id: 8, hari: 'Jumat', jam_ke: '1 - 3', waktu_mulai: '07:00', waktu_selesai: '08:45', kelas: 'Kelas 2', mata_pelajaran: 'Seni dan Budaya', ruangan: 'Ruang Kelas 2', jumlah_jp: 3 },
    { id: 13, guru_id: 2, hari: 'Sabtu', jam_ke: '1 - 5', waktu_mulai: '07:00', waktu_selesai: '09:55', kelas: 'Kelas 6', mata_pelajaran: 'Projek Penguatan Profil Pelajar Pancasila (P5)', ruangan: 'Ruang Kelas 6', jumlah_jp: 5 },
    { id: 14, guru_id: 4, hari: 'Sabtu', jam_ke: '1 - 4', waktu_mulai: '07:00', waktu_selesai: '09:20', kelas: 'Kelas 1', mata_pelajaran: 'Projek Penguatan Profil Pelajar Pancasila (P5)', ruangan: 'Ruang Kelas 1', jumlah_jp: 4 },
    { id: 15, guru_id: 6, hari: 'Sabtu', jam_ke: '1 - 2', waktu_mulai: '07:00', waktu_selesai: '08:10', kelas: 'Kelas 3', mata_pelajaran: 'Muatan Lokal (Bahasa Madura)', ruangan: 'Ruang Kelas 3', jumlah_jp: 2 }
  ],

  beban_mengajar: [
    { id: 1, guru_id: 1, jp_tatap_muka: 0, tugas_tambahan: 'Kepala Sekolah Manajerial & Supervisi', jp_tugas_tambahan: 24, ekstrakurikuler: '-', jp_ekskul: 0, keterangan: 'Ekuivalensi Tugas Pokok Kepala Sekolah (24 JP)' },
    { id: 2, guru_id: 2, jp_tatap_muka: 24, tugas_tambahan: 'Wali Kelas 6 & Koordinator Kurikulum Merdeka', jp_tugas_tambahan: 2, ekstrakurikuler: 'Pembina Pramuka Penggalang', jp_ekskul: 2, keterangan: 'Memenuhi Beban Kerja 24 JP Sertifikasi' },
    { id: 3, guru_id: 3, jp_tatap_muka: 24, tugas_tambahan: 'Wali Kelas 4 & Bendahara BOS', jp_tugas_tambahan: 2, ekstrakurikuler: 'Pembina Sanggar Seni Budaya', jp_ekskul: 2, keterangan: 'Memenuhi Beban Kerja 24 JP' },
    { id: 4, guru_id: 4, jp_tatap_muka: 24, tugas_tambahan: 'Wali Kelas 1 (Fase A)', jp_tugas_tambahan: 2, ekstrakurikuler: 'Klub Literasi Membaca', jp_ekskul: 2, keterangan: 'Memenuhi Beban Kerja 24 JP' },
    { id: 5, guru_id: 5, jp_tatap_muka: 24, tugas_tambahan: 'Ketua Tim TPPK (Pencegahan Kekerasan)', jp_tugas_tambahan: 2, ekstrakurikuler: 'Pembina BTQ & Hadrah', jp_ekskul: 2, keterangan: 'Memenuhi Syarat TPG Kemenag/Kemendikbud' },
    { id: 6, guru_id: 6, jp_tatap_muka: 24, tugas_tambahan: 'Wali Kelas 3 & Operator Dapodik', jp_tugas_tambahan: 2, ekstrakurikuler: 'Klub Komputer Dasar', jp_ekskul: 2, keterangan: 'Memenuhi Beban Kerja 24 JP' },
    { id: 7, guru_id: 7, jp_tatap_muka: 20, tugas_tambahan: 'Pengelola Sarpras Olahraga', jp_tugas_tambahan: 2, ekstrakurikuler: 'Pelatih Sepak Bola Mini & Atletik', jp_ekskul: 4, keterangan: 'Total 26 JP (Memenuhi Syarat)' },
    { id: 8, guru_id: 8, jp_tatap_muka: 24, tugas_tambahan: 'Wali Kelas 2 & Kepala Perpustakaan', jp_tugas_tambahan: 2, ekstrakurikuler: 'Klub Tari Tradisional', jp_ekskul: 2, keterangan: 'Memenuhi Beban Kerja' }
  ],

  absensi: [
    { id: 1, guru_id: 1, tanggal: '2026-08-14', waktu_masuk: '06:45', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 2, guru_id: 2, tanggal: '2026-08-14', waktu_masuk: '06:50', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 3, guru_id: 3, tanggal: '2026-08-14', waktu_masuk: '07:00', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 4, guru_id: 4, tanggal: '2026-08-14', waktu_masuk: '06:55', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 5, guru_id: 5, tanggal: '2026-08-14', waktu_masuk: '07:18', waktu_pulang: '14:30', status_kehadiran: 'Terlambat', keterangan: 'Terlambat 3 menit' },
    { id: 6, guru_id: 6, tanggal: '2026-08-14', waktu_masuk: '06:40', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 7, guru_id: 7, tanggal: '2026-08-14', waktu_masuk: '06:45', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 8, guru_id: 8, tanggal: '2026-08-14', waktu_masuk: '07:05', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    // Data Tanggal Kemarin
    { id: 9, guru_id: 1, tanggal: '2026-08-13', waktu_masuk: '06:40', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 10, guru_id: 2, tanggal: '2026-08-13', waktu_masuk: '06:52', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 11, guru_id: 3, tanggal: '2026-08-13', waktu_masuk: '06:58', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 12, guru_id: 4, tanggal: '2026-08-13', waktu_masuk: '07:00', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 13, guru_id: 5, tanggal: '2026-08-13', waktu_masuk: '06:50', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' },
    { id: 14, guru_id: 6, tanggal: '2026-08-13', waktu_masuk: '07:25', waktu_pulang: '14:30', status_kehadiran: 'Terlambat', keterangan: 'Terlambat 10 menit' },
    { id: 15, guru_id: 7, tanggal: '2026-08-13', waktu_masuk: '08:00', waktu_pulang: '15:00', status_kehadiran: 'Dinas Luar', keterangan: 'Mendampingi Lomba O2SN Tingkat Kabupaten' },
    { id: 16, guru_id: 8, tanggal: '2026-08-13', waktu_masuk: '06:50', waktu_pulang: '14:30', status_kehadiran: 'Hadir', keterangan: 'Tepat waktu' }
  ],

  pkg: [
    {
      id: 1,
      guru_id: 2,
      tahun_penilaian: 2026,
      periode: 'Tahunan',
      skor_perencanaan: 94.0,
      skor_pelaksanaan: 92.5,
      skor_evaluasi: 95.0,
      skor_profesionalisme: 90.0,
      skor_kehadiran: 96.0,
      nilai_akhir: 93.5,
      predikat: 'Amat Baik',
      nama_penilai: 'Fauzan, S.Pd.SD.',
      nip_penilai: '19720602 199605 1 001',
      catatan_rekomendasi: 'Sangat inovatif dalam memanfaatkan media ajar digital berbasis Kurikulum Merdeka.'
    },
    {
      id: 2,
      guru_id: 3,
      tahun_penilaian: 2026,
      periode: 'Tahunan',
      skor_perencanaan: 88.0,
      skor_pelaksanaan: 86.0,
      skor_evaluasi: 87.5,
      skor_profesionalisme: 85.0,
      skor_kehadiran: 92.0,
      nilai_akhir: 87.7,
      predikat: 'Baik',
      nama_penilai: 'Fauzan, S.Pd.SD.',
      nip_penilai: '19720602 199605 1 001',
      catatan_rekomendasi: 'Tingkatkan asesmen formatif berdiferensiasi pada modul ajar matematika.'
    },
    {
      id: 3,
      guru_id: 4,
      tahun_penilaian: 2026,
      periode: 'Tahunan',
      skor_perencanaan: 90.0,
      skor_pelaksanaan: 89.0,
      skor_evaluasi: 88.0,
      skor_profesionalisme: 92.0,
      skor_kehadiran: 95.0,
      nilai_akhir: 90.8,
      predikat: 'Baik',
      nama_penilai: 'Fauzan, S.Pd.SD.',
      nip_penilai: '19720602 199605 1 001',
      catatan_rekomendasi: 'Pendekatan transisi PAUD ke SD sangat baik dan menyenangkan bagi siswa kelas 1.'
    },
    {
      id: 4,
      guru_id: 5,
      tahun_penilaian: 2026,
      periode: 'Tahunan',
      skor_perencanaan: 89.0,
      skor_pelaksanaan: 90.0,
      skor_evaluasi: 89.5,
      skor_profesionalisme: 91.0,
      skor_kehadiran: 94.0,
      nilai_akhir: 90.7,
      predikat: 'Baik',
      nama_penilai: 'Fauzan, S.Pd.SD.',
      nip_penilai: '19720602 199605 1 001',
      catatan_rekomendasi: 'Penguatan Profil Pelajar Pancasila dimensi Beriman & Bertakwa terlaksana optimal.'
    },
    {
      id: 5,
      guru_id: 6,
      tahun_penilaian: 2026,
      periode: 'Tahunan',
      skor_perencanaan: 87.0,
      skor_pelaksanaan: 88.0,
      skor_evaluasi: 86.5,
      skor_profesionalisme: 94.0,
      skor_kehadiran: 93.0,
      nilai_akhir: 89.6,
      predikat: 'Baik',
      nama_penilai: 'Fauzan, S.Pd.SD.',
      nip_penilai: '19720602 199605 1 001',
      catatan_rekomendasi: 'Kinerja pengelolaan Dapodik dan pembelajaran kelas 3 seimbang dan sangat tertib.'
    },
    {
      id: 6,
      guru_id: 7,
      tahun_penilaian: 2026,
      periode: 'Tahunan',
      skor_perencanaan: 86.0,
      skor_pelaksanaan: 91.0,
      skor_evaluasi: 88.0,
      skor_profesionalisme: 87.0,
      skor_kehadiran: 95.0,
      nilai_akhir: 89.4,
      predikat: 'Baik',
      nama_penilai: 'Fauzan, S.Pd.SD.',
      nip_penilai: '19720602 199605 1 001',
      catatan_rekomendasi: 'Dedikasi tinggi dalam pembinaan atlet siswa hingga menembus prestasi tingkat provinsi.'
    },
    {
      id: 7,
      guru_id: 8,
      tahun_penilaian: 2026,
      periode: 'Tahunan',
      skor_perencanaan: 88.0,
      skor_pelaksanaan: 87.0,
      skor_evaluasi: 87.0,
      skor_profesionalisme: 86.0,
      skor_kehadiran: 94.0,
      nilai_akhir: 88.1,
      predikat: 'Baik',
      nama_penilai: 'Fauzan, S.Pd.SD.',
      nip_penilai: '19720602 199605 1 001',
      catatan_rekomendasi: 'Pengelolaan pojok baca dan perpustakaan sekolah sangat membantu peningkatan literasi.'
    }
  ],

  prestasi: [
    { id: 1, guru_id: 2, kategori: 'Guru Berprestasi', nama_prestasi: 'Juara 1 Guru SD Inovatif Tingkat Kabupaten', tingkat: 'Kabupaten', peringkat_juara: 'Juara 1', tahun: 2024, penyelenggara: 'Dinas Pendidikan Kab. Pamekasan', nomor_piagam: '002/PGRI/KAB-PROB/2024' },
    { id: 2, guru_id: 7, kategori: 'Pembimbing Siswa', nama_prestasi: 'Juara 2 O2SN Cabang Atletik SD Tingkat Provinsi', tingkat: 'Provinsi', peringkat_juara: 'Juara 2', tahun: 2024, penyelenggara: 'BBPMP Jawa Timur', nomor_piagam: '421.3/890/BBPMP-JATIM/2024' },
    { id: 3, guru_id: 3, kategori: 'Karya Inovasi', nama_prestasi: 'Karya Terbaik Pembuatan Media Pembelajaran Digital Merdeka Belajar', tingkat: 'Kabupaten', peringkat_juara: 'Juara 1', tahun: 2023, penyelenggara: 'Balai Guru Penggerak Jawa Timur', nomor_piagam: '089/BGP-JATIM/2023' },
    { id: 4, guru_id: 5, kategori: 'Pembimbing Siswa', nama_prestasi: 'Juara 1 Pentas PAI Cabang MTQ SD Tingkat Kecamatan', tingkat: 'Kecamatan', peringkat_juara: 'Juara 1', tahun: 2024, penyelenggara: 'KKG PAI Kecamatan Waru', nomor_piagam: '012/KKG-PAI/2024' }
  ],

  pelatihan: [
    { id: 1, guru_id: 2, nama_pelatihan: 'Aksi Nyata Pelatihan Mandiri PMM Topik Kurikulum Merdeka', jenis_pelatihan: 'Pelatihan Mandiri PMM', penyelenggara: 'Kemendikbudristek RI', pola_jp: 32, tanggal_mulai: '2024-02-01', tanggal_selesai: '2024-02-15', tahun: 2024, nomor_sertifikat: 'PMM/KURMER/2024/09981' },
    { id: 2, guru_id: 6, nama_pelatihan: 'Bimtek Pengelolaan Data Dapodik & Digitalisasi Sekolah', jenis_pelatihan: 'Workshop / Bimtek', penyelenggara: 'Dinas Pendidikan Kab. Pamekasan', pola_jp: 48, tanggal_mulai: '2024-05-10', tanggal_selesai: '2024-05-14', tahun: 2024, nomor_sertifikat: '421/BIMTEK-DAPO/2024' },
    { id: 3, guru_id: 4, nama_pelatihan: 'Pendidikan Guru Penggerak (PGP) Angkatan 10', jenis_pelatihan: 'Guru Penggerak', penyelenggara: 'Balai Besar Guru Penggerak Jawa Timur', pola_jp: 310, tanggal_mulai: '2024-03-01', tanggal_selesai: '2024-09-01', tahun: 2024, nomor_sertifikat: 'PGP/BGP-JATIM/2024/00231' },
    { id: 4, guru_id: 5, nama_pelatihan: 'Pengembangan Modul Ajar PAI Interaktif Berbasis AI', jenis_pelatihan: 'Diklat Fungsional', penyelenggara: 'Pusdiklat Kemenag RI', pola_jp: 60, tanggal_mulai: '2024-06-01', tanggal_selesai: '2024-06-10', tahun: 2024, nomor_sertifikat: 'PUSDIKLAT/PAI/2024/7781' }
  ],

  dokumen: [
    { id: 1, guru_id: 1, kategori_dokumen: 'SK Kepegawaian', nama_dokumen: 'SK Pengangkatan Kepala Sekolah', nomor_dokumen: '821.2/145/426.202/2021', tanggal_terbit: '2021-04-15', tanggal_kadaluarsa: '2026-04-15', ukuran_file_kb: 450, file_url: '#', file_name: 'SK_Kepala_Sekolah_Bambang_Sutrisno.pdf' },
    { id: 2, guru_id: 2, kategori_dokumen: 'Sertifikat Pendidik', nama_dokumen: 'Sertifikat Pendidik PPG Daljab PGSD', nomor_dokumen: '2005020271018', tanggal_terbit: '2014-12-20', tanggal_kadaluarsa: '', ukuran_file_kb: 520, file_url: '#', file_name: 'Serdik_Siti_Rahmawati.pdf' },
    { id: 3, guru_id: 2, kategori_dokumen: 'Ijazah', nama_dokumen: 'Ijazah S1 PGSD UNEJ', nomor_dokumen: 'UNEJ/FKIP/2007/11245', tanggal_terbit: '2007-08-10', tanggal_kadaluarsa: '', ukuran_file_kb: 680, file_url: '#', file_name: 'Ijazah_S1_PGSD_Siti_Rahmawati.pdf' },
    { id: 4, guru_id: 3, kategori_dokumen: 'SK Kepegawaian', nama_dokumen: 'SK Kenaikan Pangkat Penata Muda Tk. I (III/b)', nomor_dokumen: '823.3/210/426.202/2023', tanggal_terbit: '2023-04-01', tanggal_kadaluarsa: '2027-04-01', ukuran_file_kb: 380, file_url: '#', file_name: 'SK_Kenaikan_Pangkat_Rahmat_Hidayat.pdf' },
    { id: 5, guru_id: 4, kategori_dokumen: 'SK Kepegawaian', nama_dokumen: 'SK Pengangkatan PPPK Guru', nomor_dokumen: '810/345/426.202/2023', tanggal_terbit: '2023-06-01', tanggal_kadaluarsa: '2028-05-31', ukuran_file_kb: 410, file_url: '#', file_name: 'SK_PPPK_Dewi_Anggraini.pdf' },
    { id: 6, guru_id: 5, kategori_dokumen: 'Ijazah', nama_dokumen: 'Ijazah S2 Magister Pendidikan Islam UINSA', nomor_dokumen: 'UINSA/S2/PAI/2019/3321', tanggal_terbit: '2019-09-12', tanggal_kadaluarsa: '', ukuran_file_kb: 750, file_url: '#', file_name: 'Ijazah_S2_Muhammad_Ridwan.pdf' }
  ],

  audit_logs: [
    { id: 1, username: 'admin', aksi: 'Inisialisasi Sistem', tabel_terkait: 'sistem', deskripsi: 'Aplikasi Database Guru SD Negeri Sumber Waru 2 diinisialisasi.', created_at: new Date().toISOString() }
  ]
};

// ============================================================================
// State Management Class
// ============================================================================
class StateManager {
  constructor() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.listeners = [];
    this.db = null;
    this.isLoaded = false;
    
    // BroadcastChannel for cross-tab Auto-Sync
    if ('BroadcastChannel' in window) {
      this.syncChannel = new BroadcastChannel('sdn2_db_sync');
      this.syncChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATED') {
          console.log('[Auto-Sync] Menerima update data dari tab lain.');
          this.state = event.data.payload;
          this.notify();
        }
      };
    }
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(APP_STORAGE_KEY, 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store');
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error', event);
        reject(event);
      };
    });
  }

  async loadState() {
    try {
      await this.initDB();
    } catch (e) {
      console.warn('[DB] Gagal inisialisasi IndexedDB, menggunakan data inisial.', e);
      this.isLoaded = true;
    }

    return new Promise(async (resolve) => {
      // 1. Muat dari IndexedDB terlebih dahulu (Instan & Offline-First)
      const tx = this.db ? this.db.transaction('store', 'readonly') : null;
      
      const loadFromLocal = () => {
        if (!tx) return Promise.resolve(null);
        return new Promise((res) => {
          const store = tx.objectStore('store');
          const req = store.get('appState');
          req.onsuccess = () => res(req.result);
          req.onerror = () => res(null);
        });
      };

      const localData = await loadFromLocal();
      if (localData && (localData.profil_sekolah || localData.guru)) {
        this.state = {
          ...INITIAL_STATE,
          ...localData
        };
      }
      
      this.isLoaded = true;
      resolve(); // UI dapat langsung dirender

      // 2. Background Sync dengan Backend API
      this._syncWithBackend();
    });
  }

  /**
   * Sinkronisasi data di latar belakang dengan Backend REST API
   */
  async _syncWithBackend() {
    if (typeof window.Api === 'undefined') return;

    try {
      // Periksa konektivitas server terlebih dahulu
      const health = await window.Api.checkHealth();
      if (!health.connected) {
        console.log('[DB] Backend server belum terhubung. Beroperasi dalam mode data lokal (IndexedDB).');
        return;
      }

      // Jika token tersimpan, coba tarik data terbaru secara menyeluruh
      const token = localStorage.getItem('jwt_token') || '';
      if (token) {
        const res = await window.Api.getAllState();
        if (res && res.success && res.data) {
          const serverState = res.data;
          let changed = false;

          // Merge collections dari server
          const collections = [
            'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
            'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen', 'audit_logs'
          ];

          collections.forEach(col => {
            if (Array.isArray(serverState[col]) && serverState[col].length > 0) {
              this.state[col] = serverState[col];
              changed = true;
            }
          });

          if (serverState.profil_sekolah && serverState.profil_sekolah.nama_sekolah) {
            this.state.profil_sekolah = {
              ...this.state.profil_sekolah,
              ...serverState.profil_sekolah
            };
            changed = true;
          }

          if (serverState.users && serverState.users.length > 0) {
            // Update daftar user dengan mempertahankan password lokal jika ada
            const mergedUsers = serverState.users.map(su => {
              const localU = (this.state.users || []).find(lu => lu.username === su.username);
              return {
                ...su,
                password: localU ? localU.password : 'guru123',
                status: su.is_active ? 'aktif' : 'nonaktif'
              };
            });
            this.state.users = mergedUsers;
            changed = true;
          }

          if (changed) {
            console.log('[DB] Berhasil memperbarui state lokal dari Backend Server.');
            this.saveState(this.state, true);
            this.notify();
          }
        }
      }

      // Jalankan pemrosesan antrean offline jika ada
      if (typeof window.SyncQueue !== 'undefined') {
        window.SyncQueue.processQueue();
      }
    } catch (err) {
      console.warn('[DB] Sinkronisasi background terlewati:', err.message);
    }
  }

  saveState(newState = this.state, skipBroadcast = false) {
    this.state = newState;
    if (!this.db) return; // Jangan simpan jika DB belum siap

    try {
      const tx = this.db.transaction('store', 'readwrite');
      const store = tx.objectStore('store');
      store.put(this.state, 'appState');
    } catch (e) {
      console.error('Gagal menyimpan ke IndexedDB:', e);
    }
    
    // Auto-Sync to other browser tabs
    if (!skipBroadcast && this.syncChannel) {
      try {
        this.syncChannel.postMessage({
          type: 'STATE_UPDATED',
          payload: this.state
        });
      } catch (e) {
        console.warn('Gagal mem-broadcast state:', e);
      }
    }
    
    this.notify();
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.state); } catch (e) { console.error('Error in state listener:', e); }
    });
  }

  subscribe(cb) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  // Helper CRUD Generator
  getAll(collection) {
    return this.state[collection] || [];
  }

  getById(collection, id) {
    return (this.state[collection] || []).find(item => item.id == id);
  }

  /**
   * Menambahkan data baru (Optimistic Local Update + Backend Dispatch + Offline Queue Fallback)
   */
  insert(collection, item, logMessage = '') {
    if (!this.state[collection]) this.state[collection] = [];
    const newItem = { ...item, id: item.id || (typeof Helpers !== 'undefined' ? Helpers.generateId() : Date.now()) };
    
    // 1. Optimistic Update ke State Lokal & IndexedDB
    this.state[collection].unshift(newItem);
    
    if (logMessage) {
      this.logActivity('Tambah Data', collection, logMessage);
    }
    this.saveState();

    // 2. Dispatch ke Backend REST API atau masukkan ke Offline SyncQueue
    this._dispatchApiMutation('insert', collection, newItem);

    return newItem;
  }

  /**
   * Alias untuk insert
   */
  add(collection, item, logMessage = '') {
    return this.insert(collection, item, logMessage);
  }

  /**
   * Mengubah data yang sudah ada (Optimistic Local Update + Backend Dispatch + Offline Queue Fallback)
   */
  update(collection, id, updatedFields, logMessage = '') {
    if (!this.state[collection]) return null;
    const index = this.state[collection].findIndex(item => item.id == id);
    if (index !== -1) {
      this.state[collection][index] = {
        ...this.state[collection][index],
        ...updatedFields
      };

      const updatedItem = this.state[collection][index];

      if (logMessage) {
        this.logActivity('Ubah Data', collection, logMessage);
      }
      this.saveState();

      // 2. Dispatch ke Backend REST API atau masukkan ke Offline SyncQueue
      this._dispatchApiMutation('update', collection, updatedItem);

      return updatedItem;
    }
    return null;
  }

  /**
   * Menghapus data (Optimistic Local Update + Backend Dispatch + Offline Queue Fallback)
   */
  delete(collection, id, logMessage = '') {
    if (!this.state[collection]) return false;
    const initialLength = this.state[collection].length;
    this.state[collection] = this.state[collection].filter(item => item.id != id);
    
    // Cascade delete jika menghapus guru
    if (collection === 'guru') {
      const childCollections = ['kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar', 'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen'];
      childCollections.forEach(col => {
        if (this.state[col]) {
          this.state[col] = this.state[col].filter(item => item.guru_id != id);
        }
      });
    }

    if (this.state[collection].length < initialLength) {
      if (logMessage) {
        this.logActivity('Hapus Data', collection, logMessage);
      }
      this.saveState();

      // 2. Dispatch ke Backend REST API atau masukkan ke Offline SyncQueue
      this._dispatchApiMutation('delete', collection, { id });

      return true;
    }
    return false;
  }

  /**
   * Internal Helper: Mengirim mutasi ke Backend API atau menyimpan ke antrean offline
   */
  _dispatchApiMutation(op, collection, data) {
    const token = localStorage.getItem('jwt_token') || '';
    
    // Tentukan endpoint API yang sesuai
    let endpoint = '';
    if (collection === 'guru') {
      endpoint = op === 'insert' ? '/api/guru' : `/api/guru/${data.id}`;
    } else if (collection === 'kepegawaian') {
      endpoint = op === 'insert' ? '/api/kepegawaian' : `/api/kepegawaian/${data.id}`;
    } else if (collection === 'jadwal_mengajar' || collection === 'jadwal') {
      endpoint = op === 'insert' ? '/api/jadwal' : `/api/jadwal/${data.id}`;
    } else if (collection === 'absensi') {
      endpoint = op === 'insert' ? '/api/absensi' : `/api/absensi/${data.id}`;
    } else {
      endpoint = op === 'insert' ? `/api/data/${collection}` : `/api/data/${collection}/${data.id}`;
    }

    const method = op === 'insert' ? 'POST' : (op === 'update' ? 'PUT' : 'DELETE');

    // Jika online dan Api Client tersedia, kirim langsung
    if (navigator.onLine && window.Api && token) {
      const promise = (method === 'DELETE')
        ? window.Api.delete(endpoint)
        : (method === 'POST' ? window.Api.post(endpoint, data) : window.Api.put(endpoint, data));

      promise.catch(err => {
        console.warn(`[DB] Gagal mengirim ${op} ke backend (${collection}), menyimpan ke antrean offline:`, err.message);
        if (typeof window.SyncQueue !== 'undefined') {
          window.SyncQueue.addOperation({ op, table: collection, data, tempId: data.id });
        }
      });
    } else {
      // Masukkan ke offline sync queue
      if (typeof window.SyncQueue !== 'undefined') {
        window.SyncQueue.addOperation({ op, table: collection, data, tempId: data.id });
      }
    }
  }

  /**
   * Tarik seluruh data terbaru dari Backend Server ke State Lokal
   */
  async pullAllFromBackend() {
    if (!window.Api) throw new Error('ApiClient tidak tersedia.');
    const res = await window.Api.getAllState();
    if (!res || !res.success || !res.data) throw new Error('Format data server tidak valid.');

    const serverState = res.data;
    const collections = [
      'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
      'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen', 'audit_logs'
    ];

    collections.forEach(col => {
      if (Array.isArray(serverState[col])) {
        this.state[col] = serverState[col];
      }
    });

    if (serverState.profil_sekolah) {
      this.state.profil_sekolah = {
        ...this.state.profil_sekolah,
        ...serverState.profil_sekolah
      };
    }

    if (Array.isArray(serverState.users) && serverState.users.length > 0) {
      this.state.users = serverState.users.map(su => ({
        ...su,
        password: (this.state.users.find(u => u.username === su.username) || {}).password || 'guru123',
        status: su.is_active ? 'aktif' : 'nonaktif'
      }));
    }

    this.saveState();
    return true;
  }

  /**
   * Dorong seluruh data lokal ke Backend Server
   */
  async pushAllToBackend() {
    if (!window.Api) throw new Error('ApiClient tidak tersedia.');
    const res = await window.Api.pushAllState(this.state);
    if (!res || !res.success) throw new Error(res.error || 'Gagal mengirim data ke server.');
    return res;
  }

  logActivity(aksi, tabel, deskripsi) {
    const user = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const log = {
      id: typeof Helpers !== 'undefined' ? Helpers.generateId() : Date.now(),
      username: user ? user.username : 'Sistem',
      aksi: aksi,
      tabel_terkait: tabel,
      deskripsi: deskripsi,
      created_at: new Date().toISOString()
    };
    if (!this.state.audit_logs) this.state.audit_logs = [];
    this.state.audit_logs.unshift(log);
    if (this.state.audit_logs.length > 200) {
      this.state.audit_logs = this.state.audit_logs.slice(0, 200);
    }
  }

  // Reset / Restore
  resetToInitial() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.saveState();
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.guru && parsed.profil_sekolah) {
        this.state = parsed;
        this.saveState();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import gagal:', e);
      return false;
    }
  }

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  }
}

// Global Singleton Instance
const DB = new StateManager();
