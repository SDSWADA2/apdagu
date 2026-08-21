const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Client keys are mapped to the actual server-side table names.
const TABLE_MAP = Object.freeze({
  guru: 'guru',
  kepegawaian: 'kepegawaian',
  pendidikan: 'riwayat_pendidikan',
  sertifikasi: 'sertifikasi',
  jadwal_mengajar: 'jadwal_mengajar',
  beban_mengajar: 'beban_mengajar',
  absensi: 'absensi',
  pkg: 'penilaian_kinerja_guru',
  prestasi: 'prestasi_guru',
  pelatihan: 'pelatihan_guru',
  dokumen: 'dokumen_guru'
});

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_CHANGES = 100;

function assertIdentifier(value, label = 'field') {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label} identifier.`);
  }
  return value;
}

function resolveTable(tableKey) {
  if (!Object.prototype.hasOwnProperty.call(TABLE_MAP, tableKey)) {
    throw new Error('Table not allowed.');
  }
  return TABLE_MAP[tableKey];
}

function buildInsert(table, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid insert data.');
  }

  const keys = Object.keys(data);
  if (!keys.length) throw new Error('Insert data cannot be empty.');

  const safeKeys = keys.map(key => assertIdentifier(key));
  const cols = safeKeys.map(key => `\`${key}\``).join(', ');
  const placeholders = safeKeys.map(() => '?').join(', ');
  const values = safeKeys.map(key => data[key]);
  const sql = `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`;
  return { sql, values };
}

function buildUpdate(table, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid update data.');
  }

  const id = data.id;
  if (id === undefined || id === null || id === '') throw new Error('Missing id for update.');

  const keys = Object.keys(data).filter(key => key !== 'id');
  if (!keys.length) throw new Error('Update data contains no mutable fields.');

  const safeKeys = keys.map(key => assertIdentifier(key));
  const set = safeKeys.map(key => `\`${key}\` = ?`).join(', ');
  const values = safeKeys.map(key => data[key]);
  values.push(id);

  const sql = `UPDATE \`${table}\` SET ${set}, updated_at = NOW() WHERE id = ?`;
  return { sql, values };
}

router.post('/changes', async (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.changes)) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }
  if (payload.changes.length === 0) {
    return res.json({ success: true, results: [], appliedAt: new Date().toISOString() });
  }
  if (payload.changes.length > MAX_CHANGES) {
    return res.status(413).json({ error: `Too many changes. Maximum is ${MAX_CHANGES}.` });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const results = [];

    for (const change of payload.changes) {
      if (!change || typeof change !== 'object') throw new Error('Invalid change entry.');

      const { op, table: tableKey, data, tempId } = change;
      const table = resolveTable(tableKey);

      if (op === 'insert') {
        const { sql, values } = buildInsert(table, data);
        const [result] = await conn.execute(sql, values);
        results.push({ tempId: tempId || null, id: result.insertId, table: tableKey });
      } else if (op === 'update') {
        const { sql, values } = buildUpdate(table, data);
        const [result] = await conn.execute(sql, values);
        if (result.affectedRows === 0) throw new Error(`Record not found for update: ${tableKey}/${data.id}`);
        results.push({ tempId: tempId || null, id: data.id, table: tableKey });
      } else if (op === 'delete') {
        if (!data || typeof data !== 'object' || data.id === undefined || data.id === null) {
          throw new Error('Missing id for delete.');
        }
        const [result] = await conn.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [data.id]);
        if (result.affectedRows === 0) throw new Error(`Record not found for delete: ${tableKey}/${data.id}`);
        results.push({ tempId: null, id: data.id, table: tableKey });
      } else {
        throw new Error(`Unsupported operation: ${op}`);
      }
    }

    await conn.commit();
    return res.json({ success: true, results, appliedAt: new Date().toISOString() });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[SYNC ERROR]', err);
    return res.status(400).json({ error: err.message || 'Sync failed.' });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/changes', async (req, res) => {
  const since = req.query.since;
  const tableKey = req.query.table;

  if (!since || !tableKey) {
    return res.status(400).json({ error: 'Missing since or table parameter.' });
  }

  let table;
  try {
    table = resolveTable(tableKey);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const parsedSince = new Date(since);
  if (Number.isNaN(parsedSince.getTime())) {
    return res.status(400).json({ error: 'Invalid since timestamp.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT * FROM \`${table}\` WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 1000`,
      [parsedSince.toISOString().slice(0, 19).replace('T', ' ')]
    );
    return res.json({ success: true, data: rows, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error('[SYNC GET ERROR]', err);
    return res.status(500).json({ error: 'Failed to fetch changes.' });
  }
});

module.exports = router;
