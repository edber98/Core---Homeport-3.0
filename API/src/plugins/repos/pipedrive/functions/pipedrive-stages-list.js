const { utils } = require("./utils");

module.exports = {
  async pipedrive_stages_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.pipeline_id) query.pipeline_id = parseInt(d.pipeline_id, 10);

    log('Récupération de la liste...');
    const res = await utils.pdRequest(opts, "/stages", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const stages = results.map(r => ({ id: r.id, name: r.name, pipeline_id: r.pipeline_id, order_nr: r.order_nr, active_flag: r.active_flag }));
    const hasMore = res.pagination?.more_items_in_collection ? "true" : "false";
    return { ok: true, hasMore, stages , totalCount: stages.length };
  }
};
