const { utils } = require("./utils");

module.exports = {
  async pl_categories_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;

    const res = await utils.plRequest(opts, "/categories", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.categories) || [];
    const categories = results.map(r => ({ id: String(r.id || ""), label: r.label || "", group_label: r.group_label || "" }));
    return { ok: true, categories };
  }
};
