# Seed admin user
// Usage: ADMIN_USERNAME=admin ADMIN_PASSWORD=ChangeMe node backend/scripts/seed_admin.js

const pool = require('../config/db');
const bcrypt = require('bcrypt');

(async function(){
  try {
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD;
    if(!adminPass) {
      console.error('Please set ADMIN_PASSWORD environment variable when running this script.');
      process.exit(1);
    }

    const hashed = await bcrypt.hash(adminPass, 12);

    const [rows] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [adminUser]);
    if(rows.length > 0){
      console.log('Admin user already exists.');
      process.exit(0);
    }

    await pool.query('INSERT INTO users (username, password_hash, nama_lengkap, role, is_active, created_at) VALUES (?, ?, ?, ?, TRUE, NOW())', [adminUser, hashed, 'Administrator', 'admin']);
    console.log('Admin user created:', adminUser);
    process.exit(0);
  } catch(err){
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
})();
