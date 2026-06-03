const { utils } = require('./utils');
module.exports = {
  async timescaledb_records_count(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.table) return { ok: false, error: 'table requis.' };
    const schema = String(d.schema || 'public').replace(/"/g, '""');
    const table = String(d.table).replace(/"/g, '""');
    let sql = `SELECT COUNT(*)::bigint AS count FROM "${schema}"."${table}"`;
    if (d.where) sql += ` WHERE ${d.where}`;
    const r = await utils.query((opts && opts.credentials) || {}, sql, []);
    if (!r.ok) return r;
    const count = Number(r.rows?.[0]?.count || 0);
    return { ok: true, count, rows: [{ count }], rowCount: 1, fields: ['count'], raw: r.raw };
  }
};
