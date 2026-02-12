const { utils } = require("./utils");

function toStr(value) {
  const str = String(value || "").trim();
  return str || null;
}

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_purchase_orders_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (data.state) domain.push(["state", "=", data.state]);

        const res = await utils.odooCall(opts, "purchase.order", "search_read", [], {
          domain, fields: ["id", "name", "partner_id", "state", "amount_total", "date_order"], limit
        });
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "purchase.order", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, purchase_orders: res.data, totalCount: countRes.data || 0 };
  }
};
