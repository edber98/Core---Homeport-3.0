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
  async odoo_stock_quant_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (toInt(data.product_id)) domain.push(["product_id", "=", toInt(data.product_id)]);
        if (toInt(data.location_id)) domain.push(["location_id", "=", toInt(data.location_id)]);

        const res = await utils.odooCall(opts, "stock.quant", "search_read", [], {
          domain, limit
        });
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "stock.quant", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, quants: res.data, totalCount: countRes.data || 0 };
  }
};
