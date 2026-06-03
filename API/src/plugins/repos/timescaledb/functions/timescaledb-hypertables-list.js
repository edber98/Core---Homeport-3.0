const { utils } = require('./utils');
module.exports = {
  async timescaledb_hypertables_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const schema = d.schema || null;
    const sql = schema
      ? 'SELECT hypertable_schema, hypertable_name, num_dimensions, num_chunks, compression_enabled FROM timescaledb_information.hypertables WHERE hypertable_schema = $1 ORDER BY hypertable_name'
      : 'SELECT hypertable_schema, hypertable_name, num_dimensions, num_chunks, compression_enabled FROM timescaledb_information.hypertables ORDER BY hypertable_schema, hypertable_name';
    const r = await utils.query((opts && opts.credentials) || {}, sql, schema ? [schema] : []);
    if (!r.ok) return r;
    return { ok: true, tables: r.rows || [], totalCount: (r.rows || []).length, raw: r.raw };
  }
};
