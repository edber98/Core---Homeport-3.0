const { utils } = require("./utils");

module.exports = {
  async pipedrive_deal_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const term = (d.term || "").trim();
    if (!term) return { ok: false, error: "Missing term." };
    const limit = parseInt(d.limit, 10) || 10;

    log('Recherche en cours...');
    const res = await utils.pdRequest(opts, "/deals/search", { query: { term, limit } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const items = (res.data && res.data.items) || [];
    const deals = items.map(i => { const r = i.item || {}; return { id: r.id, title: r.title, value: r.value, currency: r.currency, stage_id: r.stage?.id, pipeline_id: r.pipeline?.id, status: r.status, person_id: r.person?.id, org_id: r.organization?.id, add_time: "" }; });
    return { ok: true, deals , totalCount: deals.length };
  }
};
