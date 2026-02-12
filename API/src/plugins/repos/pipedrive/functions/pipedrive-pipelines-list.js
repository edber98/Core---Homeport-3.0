const { utils } = require("./utils");

module.exports = {
  async pipedrive_pipelines_list(node, msg, inputs, opts) {
    const res = await utils.pdRequest(opts, "/pipelines");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const pipelines = results.map(r => ({ id: r.id, name: r.name, active: r.active, order_nr: r.order_nr, add_time: r.add_time }));
    const hasMore = res.pagination?.more_items_in_collection ? "true" : "false";
    return { ok: true, hasMore, pipelines };
  }
};
