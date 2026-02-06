const { utils } = require("./utils");

module.exports = {
  async ps_customers_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query["limit"] = d.limit;
    if (d.page && d.limit) query["limit"] = ((d.page - 1) * d.limit) + "," + d.limit;
    const res = await utils.psRequest(opts, "/customers", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.customers) || [];
    const customers = items.map(c => ({ id: String(c.id), email: c.email || "", firstname: c.firstname || "", lastname: c.lastname || "", active: String(c.active || ""), date_add: c.date_add || "" }));
    return { ok: true, customers };
  }
};
