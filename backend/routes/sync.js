const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Whitelist tables the client is allowed to sync
const ALLOWED_TABLES = new Set([
  'guru','kepegawaian','pendidikan','sertifikasi','jadwal_mengajar',
  'beban_mengajar','absensi','pkg','prestasi','pelatihan','dokumen'
]);

// Helper: build insert query dynamically (parameterized)
function buildInsert(table, data) {
  const keys = Object.keys(data);
  const cols = keys.map(k => `\`${k}\``).join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => data[k]);
  const sql = `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`;
  return { sql, values };
}

function buildUpdate(table, data) {
  // requires id in data
  const id = data.id;
  if (!id) throw new Error('Missing id for update');
  const keys = Object.keys(data).filter(k => k !== 'id');
  const set = keys.map(k => `\`${k}\` = ?`).join(', ');
  const values = keys.map(k => data[k]);
  const sql = `UPDATE \`${table}\` SET ${set} WHERE id = ?`;
  values.push(id);
  return { sql, values };
}

// POST /changes
// Body: { clientId: string, changes: [{ op: 'insert'|'update'|'delete', table, data, tempId?, timestamp? }, ...] }
router.post('/changes', async (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.changes)) return res.status(400).json({ error: 'Invalid payload' });

  const changes = payload.changes;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const results = [];

    for (const change of changes) {
      const { op, table, data, tempId } = change;
      if (!ALLOWED_TABLES.has(table)) throw new Error(`Table not allowed: ${table}`);

      if (op === 'insert') {
        const { sql, values } = buildInsert(table, data);
        const [result] = await conn.execute(sql, values);
        results.push({ tempId: tempId || null, id: result.insertId, table });

        // Optionally write audit log
        // await conn.execute('INSERT INTO audit_logs (username, aksi, tabel_terkait, deskripsi) VALUES (?, ?, ?, ?)', [payload.username || 'system', 'insert', table, `Created record ${result.insertId}`]);
      } else if (op === 'update') {
        const { sql, values } = buildUpdate(table, data);
        await conn.execute(sql, values);
        results.push({ tempId: tempId || null, id: data.id, table });
      } else if (op === 'delete') {
        if (!data || !data.id) throw new Error('Missing id for delete');
        await conn.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [data.id]);
        results.push({ tempId: null, id: data.id, table });
      } else {
        throw new Error(`Unsupported op: ${op}`);
      }
    }

    await conn.commit();
    res.json({ success: true, results, appliedAt: new Date().toISOString() });
  } catch (err) {
    await conn.rollback();
    console.error('[SYNC ERROR]', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  } finally {
    conn.release();
  }
});

// GET /changes?since=2026-08-19T00:00:00Z&table=guru
// Simple incremental pull: returns rows from allowed table updated after `since` timestamp
router.get('/changes', async (req, res) => {
  const since = req.query.since;
  const table = req.query.table;
  if (!since || !table) return res.status(400).json({ error: 'Missing since or table parameter' });
  if (!ALLOWED_TABLES.has(table)) return res.status(400).json({ error: 'Table not allowed' });

  try {
    const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 1000`, [since]);
    res.json({ success: true, data: rows, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error('[SYNC GET ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch changes' });
  }
});

module.exports = router;
