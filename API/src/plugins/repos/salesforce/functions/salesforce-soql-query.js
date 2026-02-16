const { utils } = require("./utils");

module.exports = {
  async salesforce_soql_query(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = (d.query || "").trim();
    if (!query) return { ok: false, error: "Missing query." };

    log('Recherche en cours...');
    const res = await utils.sfRequest(opts, `/query`, { query: { q: query } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const data = res.data || {};
    return { ok: true, totalSize: data.totalSize, done: data.done, records: JSON.stringify(data.records || []) };
  }
};
