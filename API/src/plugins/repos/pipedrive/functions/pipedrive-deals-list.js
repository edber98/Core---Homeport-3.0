const { utils } = require("./utils");

module.exports = {
  async pipedrive_deals_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const start = parseInt(d.start, 10) || 0;

    log('Récupération de la liste...');
    const res = await utils.pdRequest(opts, "/deals", { query: { limit, start } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const deals = results.map(r => ({ id: r.id, title: r.title, value: r.value, currency: r.currency, stage_id: r.stage_id, pipeline_id: r.pipeline_id, status: r.status, person_id: r.person_id?.value || r.person_id, org_id: r.org_id?.value || r.org_id, add_time: r.add_time }));
    const hasMore = res.pagination?.more_items_in_collection ? "true" : "false";
    return { ok: true, hasMore, deals };
  }
};
