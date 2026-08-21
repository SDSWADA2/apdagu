const pool = require('./config/db');

async function testConnection() {
  try {
    const dbTest = await pool.testDbConnection();
    console.log('Connection Test Result:', dbTest);

    if (dbTest.connected) {
      const { rows } = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log('Tables in public schema:');
      rows.forEach(r => console.log(' - ' + r.table_name));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

testConnection();
