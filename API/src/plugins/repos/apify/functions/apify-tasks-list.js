const { utils } = require("./utils");

module.exports = {
  async apify_tasks_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit !== undefined && d.limit !== null && d.limit !== "") query.limit = d.limit;
    if (d.offset !== undefined && d.offset !== null && d.offset !== "") query.offset = d.offset;
    if (d.desc !== undefined && d.desc !== null && d.desc !== "") query.desc = d.desc;

    const res = await utils.apifyRequest(opts, "/actor-tasks", { method: "GET", query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawItems = utils.asArray(res.data?.data || res.data);
    const items = rawItems.map(utils.itemFromUnknown);
    return {
      ok: true,
      items,
      totalCount: Number(res.data?.total || res.data?.count || items.length),
      nextCursor: ""
    };
  }
};
