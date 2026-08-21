const pool = require('../config/db');

async function migrate() {
  console.log('Starting realtime database migration...');
  
  const tables = [
    'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 
    'jadwal_mengajar', 'beban_mengajar', 'absensi', 'pkg', 
    'prestasi', 'pelatihan', 'dokumen'
  ];
  
  for (const table of tables) {
    console.log(`Migrating table ${table}...`);
    try {
      await pool.query(`
        ALTER TABLE ${table}
        ADD COLUMN created_by VARCHAR(50) DEFAULT NULL,
        ADD COLUMN updated_by VARCHAR(50) DEFAULT NULL,
        ADD COLUMN is_deleted TINYINT(1) DEFAULT 0
      `);
      console.log(`✅ Table ${table} migrated successfully.`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`⚠️ Columns already exist in ${table}, skipping.`);
      } else {
        console.error(`❌ Error migrating ${table}:`, e.message);
      }
    }
  }
  
  console.log('Migration completed.');
  process.exit(0);
}

migrate();
