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
  async odoo_stock_pickings_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (data.state) domain.push(["state", "=", data.state]);
        if (toInt(data.picking_type_id)) domain.push(["picking_type_id", "=", toInt(data.picking_type_id)]);

        const res = await utils.odooCall(opts, "stock.picking", "search_read", [], {
          domain, limit
        });
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "stock.picking", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, pickings: res.data, totalCount: countRes.data || 0 };
  }
};
