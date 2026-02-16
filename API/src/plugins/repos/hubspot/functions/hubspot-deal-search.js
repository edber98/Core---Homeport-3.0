const { utils } = require("./utils");

module.exports = {
  async hubspot_deal_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = (d.query || "").trim();
    if (!query) return { ok: false, error: "Missing query." };

    const limit = parseInt(d.limit, 10) || 10;

    log('Recherche en cours...');
    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/deals/search", {
      method: "POST",
      body: { query, limit }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.results) || [];
    const deals = results.map(r => ({ id: r.id, ...r.properties, createdate: r.createdAt }));
    return { ok: true, deals , totalCount: deals.length };
  }
};
