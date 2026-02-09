const { utils } = require("./utils");

module.exports = {
  async pl_estimates_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;

    const res = await utils.plRequest(opts, "/estimates", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.estimates) || [];
    const estimates = results.map(r => ({ id: String(r.id || ""), estimate_number: r.estimate_number || "", label: r.label || "", amount: String(r.amount || r.total || ""), status: r.status || "", date: r.date || "" }));
    return { ok: true, estimates };
  }
};
