const bcrypt = require('bcrypt');

/**
 * Seed data awal pengguna sistem SD Negeri Sumber Waru 2
 * Password di-hash dinamis menggunakan bcrypt sesuai akun demo frontend:
 * - admin / admin123
 * - operator / operator123
 * - guru1 / guru123
 * - guru2 / guru123
 */
exports.seed = async function(knex) {
  await knex('users').del().catch(() => {});

  const hashAdmin = await bcrypt.hash('admin123', 10);
  const hashOperator = await bcrypt.hash('operator123', 10);
  const hashGuru = await bcrypt.hash('guru123', 10);

  await knex('users').insert([
    {
      id: 1,
      username: 'admin',
      password_hash: hashAdmin,
      nama_lengkap: 'Administrator Utama (KS)',
      email: 'admin@sdnsumberwaru2.sch.id',
      role: 'admin',
      is_active: true
    },
    {
      id: 2,
      username: 'operator',
      password_hash: hashOperator,
      nama_lengkap: 'Ahmad Fauzi (Operator Dapodik)',
      email: 'operator@sdnsumberwaru2.sch.id',
      role: 'operator',
      guru_id: 6,
      is_active: true
    },
    {
      id: 3,
      username: 'guru1',
      password_hash: hashGuru,
      nama_lengkap: 'Siti Rahmawati, S.Pd., Gr.',
      email: 'siti.rahma@sdnsumberwaru2.sch.id',
      role: 'guru',
      guru_id: 2,
      is_active: true
    },
    {
      id: 4,
      username: 'guru2',
      password_hash: hashGuru,
      nama_lengkap: 'Budi Santoso, S.Pd.',
      email: 'budi.santoso@sdnsumberwaru2.sch.id',
      role: 'guru',
      guru_id: 3,
      is_active: true
    }
  ]);
};
