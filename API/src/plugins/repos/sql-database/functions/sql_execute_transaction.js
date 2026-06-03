const { utils } = require('./utils');
module.exports = {
  async sql_execute_transaction(node, msg, inputs, opts) {
    const d = inputs || {};
    let statements = d.statements;
    if (!statements) return { ok: false, error: 'statements requis.' };
    if (typeof statements === 'string') { try { statements = JSON.parse(statements); } catch { return { ok: false, error: 'statements JSON invalide.' }; } }
    if (!Array.isArray(statements) || !statements.length) return { ok: false, error: 'statements doit être une liste non vide.' };
    const credentials = (opts && opts.credentials) || {};
    const db = utils.getClient(credentials);
    if (db.type === 'pg') {
      const c = db.client;
      try {
        await c.connect();
        await c.query('BEGIN');
        const results = [];
        for (const s of statements) {
          const q = typeof s === 'string' ? s : s.query;
          const p = typeof s === 'string' ? undefined : s.params;
          const r = await c.query(q, p);
          results.push({ rowCount: r.rowCount || 0, rows: r.rows || [] });
        }
        await c.query('COMMIT');
        await c.end();
        return { ok: true, status: 'success', message: 'Transaction exécutée.', results };
      } catch (e) {
        try { await c.query('ROLLBACK'); await c.end(); } catch {}
        return { ok: false, error: e.message };
      }
    }
    let conn;
    try {
      const mysql = require('mysql2/promise');
      conn = await mysql.createConnection(db.config);
      await conn.beginTransaction();
      const results = [];
      for (const s of statements) {
        const q = typeof s === 'string' ? s : s.query;
        const p = typeof s === 'string' ? undefined : s.params;
        const [rows] = await conn.execute(q, p);
        results.push(Array.isArray(rows) ? { rowCount: rows.length, rows } : { rowCount: rows.affectedRows || 0, rows: [] });
      }
      await conn.commit();
      await conn.end();
      return { ok: true, status: 'success', message: 'Transaction exécutée.', results };
    } catch (e) {
      if (conn) { try { await conn.rollback(); await conn.end(); } catch {} }
      return { ok: false, error: e.message };
    }
  }
};
