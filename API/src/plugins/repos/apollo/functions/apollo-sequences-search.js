const { utils } = require("./utils");

module.exports = {
  async apollo_sequences_search(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
    if (d.q_name) body.q_name = d.q_name;
    if (d.page) body.page = d.page;
    if (d.per_page) body.per_page = d.per_page;
    const res = await utils.apiRequest(opts, "/emailer_campaigns/search", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.listResult(res.data);
  }
};
