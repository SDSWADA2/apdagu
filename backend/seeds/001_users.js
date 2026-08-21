const bcrypt = require('bcrypt');

const requireCredential = (name, minLength = 12) => {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(`${name} must be configured and at least ${minLength} characters long.`);
  }
  return value;
};

exports.seed = async function seedUsers(knex) {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const operatorUsername = process.env.OPERATOR_USERNAME || 'operator';
  const adminPassword = requireCredential('ADMIN_PASSWORD');
  const operatorPassword = requireCredential('OPERATOR_PASSWORD');
  const rounds = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
    throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 15.');
  }

  await knex('users').del();

  await knex('users').insert([
    {
      username: adminUsername,
      password_hash: await bcrypt.hash(adminPassword, rounds),
      nama_lengkap: 'Administrator Sekolah',
      email: process.env.ADMIN_EMAIL || null,
      role: 'admin',
      is_active: true
    },
    {
      username: operatorUsername,
      password_hash: await bcrypt.hash(operatorPassword, rounds),
      nama_lengkap: 'Operator Dapodik',
      email: process.env.OPERATOR_EMAIL || null,
      role: 'operator',
      is_active: true
    }
  ]);
};
