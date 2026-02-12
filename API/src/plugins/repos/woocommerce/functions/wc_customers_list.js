const { utils } = require("./utils");

module.exports = {
  async wc_customers_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.search) query.search = d.search;
    if (d.page) query.page = d.page;
    const res = await utils.wcRequest(opts, "/customers", { query });
    if (!res.ok) return res;
    const items = Array.isArray(res.data) ? res.data : [];
    const customers = items.map(c => ({ id: String(c.id), email: c.email || "", first_name: c.first_name || "", last_name: c.last_name || "", username: c.username || "", date_created: c.date_created || "" }));
    return { ok: true, customers, totalCount: res.totalCount || 0, totalPages: res.totalPages || 0 };
  }
};
