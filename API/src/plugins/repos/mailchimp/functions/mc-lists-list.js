const { utils } = require("./utils");

module.exports = {
  async mc_lists_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const count = parseInt(d.count, 10) || 10;
    const offset = parseInt(d.offset, 10) || 0;

    const res = await utils.mailchimpRequest(opts, "/lists", { query: { count, offset } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.lists) || [];
    const lists = results.map(r => ({ id: r.id || "", name: r.name || "", memberCount: String(r.stats?.member_count || 0), dateCreated: r.date_created || "" }));
    return { ok: true, lists };
  }
};
