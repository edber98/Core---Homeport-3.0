const { utils } = require('./utils');

module.exports = {
  async cassandra_table_truncate(node, msg, inputs, opts) {
    const d = inputs || {};
    const keyspace = String(d.keyspace || opts?.credentials?.keyspace || '').trim();
    const table = String(d.table || '').trim();
    if (!table) return { ok: false, error: 'table requise.' };

    const full = keyspace ? `\"${keyspace}\".\"${table}\"` : `\"${table}\"`;
    return utils.run('cassandra_query_execute', { query: `TRUNCATE ${full}` }, opts);
  }
};
