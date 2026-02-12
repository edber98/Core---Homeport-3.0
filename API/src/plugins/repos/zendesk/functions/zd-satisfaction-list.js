const { utils } = require("./utils");

module.exports = {
  async zd_satisfaction_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.page) query.page = parseInt(d.page, 10);

    const res = await utils.zendeskRequest(opts, "/satisfaction_ratings.json", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, totalCount: res.data?.count || 0, status: "success", message: JSON.stringify(res.data) };
  }
};
