const fs = require('fs');
const path = require('path');

exports.up = async function(knex) {
  const sqlPath = path.join(__dirname, '001_initial_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  // Execute as raw SQL batch
  return knex.raw(sql);
};

exports.down = async function(knex) {
  // Drop tables in reverse order of creation to respect FK constraints
  const tables = [
    'audit_logs', 'dokumen', 'pelatihan', 'prestasi', 'pkg', 'absensi', 'beban_mengajar',
    'jadwal_mengajar', 'sertifikasi', 'pendidikan', 'kepegawaian', 'guru', 'users', 'profil_sekolah'
  ];
  for (const t of tables) {
    // ignore errors
    try {
      await knex.schema.raw(`DROP TABLE IF EXISTS \`${t}\``);
    } catch (e) {
      // continue
    }
  }
};
