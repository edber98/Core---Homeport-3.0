const { utils } = require('./utils');
module.exports = {
  async sql_count(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.table) return { ok: false, error: 'Table requise.' };
    const credentials = (opts && opts.credentials) || {};
    const dbType = credentials.dbType || 'mysql';
    const quote = dbType === 'postgresql' || dbType === 'postgres' ? '"' : '`';
    let query = `SELECT COUNT(*) AS count FROM ${quote}${d.table}${quote}`;
    if (d.where) query += ` WHERE ${d.where}`;
    const res = await utils.executeQuery(credentials, query);
    if (!res.ok) return res;
    const count = Number((res.rows && res.rows[0] && (res.rows[0].count ?? res.rows[0].COUNT ?? Object.values(res.rows[0])[0])) || 0);
    return { ok: true, count, rows: [{ count }] };
  }
};
