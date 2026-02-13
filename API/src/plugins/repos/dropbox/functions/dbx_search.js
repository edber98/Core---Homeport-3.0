const { utils } = require("./utils");

module.exports = {
  async dbx_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Requête de recherche requise." };

    const body = { query: d.query, options: { max_results: d.maxResults || 100 } };
    if (d.path) body.options.path = d.path;

    log('Recherche en cours...');
    const res = await utils.dbxRequest(opts, "/files/search_v2", body);
    if (!res.ok) return res;
    const files = (res.data.matches || []).map(m => utils.mapEntry(m.metadata?.metadata || m.metadata || m));
    return { ok: true, files };
  }
};
