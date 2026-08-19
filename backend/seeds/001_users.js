/*
  Seed initial admin & operator users
  Password hashes are precomputed (bcrypt) for demo purposes. Replace with secure passwords in production.
*/
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del().catch(() => {});

  await knex('users').insert([
    {
      username: 'admin',
      password_hash: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      nama_lengkap: 'Administrator Sekolah',
      email: 'admin@sdnsumberwaru2.sch.id',
      role: 'admin',
      is_active: true
    },
    {
      username: 'operator',
      password_hash: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      nama_lengkap: 'Operator Dapodik',
      email: 'operator@sdnsumberwaru2.sch.id',
      role: 'operator',
      is_active: true
    }
  ]);
};
