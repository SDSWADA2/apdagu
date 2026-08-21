/**
 * ============================================================================
 * SEEDER: Akun Pengguna Demo — SD Negeri Sumber Waru 2
 * ============================================================================
 *
 * Akun Demo (setelah menjalankan npm run seed):
 *   admin    / admin123    → Admin (Kepala Sekolah)
 *   operator / operator123 → Operator Dapodik
 *   guru1    / guru123     → Guru Kelas
 *   guru2    / guru123     → Guru Kelas
 *
 * Catatan:
 *   - guru_id dibiarkan NULL karena seeder ini dijalankan sebelum data guru ada
 *   - Setelah data guru dimasukkan, hubungkan guru_id via UPDATE manual atau
 *     tambahkan seeder khusus data guru
 */

'use strict';

const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  // Hapus semua user lama (jika ada), lalu isi ulang
  await knex('users').del().catch(() => {});

  const hashAdmin    = await bcrypt.hash('admin123',    10);
  const hashOperator = await bcrypt.hash('operator123', 10);
  const hashGuru     = await bcrypt.hash('guru123',     10);

  await knex('users').insert([
    {
      id:            1,
      username:      'admin',
      password_hash: hashAdmin,
      nama_lengkap:  'Administrator Utama (KS)',
      email:         'admin@sdnsumberwaru2.sch.id',
      role:          'admin',
      guru_id:       null,
      is_active:     true,
    },
    {
      id:            2,
      username:      'operator',
      password_hash: hashOperator,
      nama_lengkap:  'Ahmad Fauzi (Operator Dapodik)',
      email:         'operator@sdnsumberwaru2.sch.id',
      role:          'operator',
      guru_id:       null,
      is_active:     true,
    },
    {
      id:            3,
      username:      'guru1',
      password_hash: hashGuru,
      nama_lengkap:  'Siti Rahmawati, S.Pd., Gr.',
      email:         'siti.rahma@sdnsumberwaru2.sch.id',
      role:          'guru',
      guru_id:       null,
      is_active:     true,
    },
    {
      id:            4,
      username:      'guru2',
      password_hash: hashGuru,
      nama_lengkap:  'Budi Santoso, S.Pd.',
      email:         'budi.santoso@sdnsumberwaru2.sch.id',
      role:          'guru',
      guru_id:       null,
      is_active:     true,
    },
  ]);
};
