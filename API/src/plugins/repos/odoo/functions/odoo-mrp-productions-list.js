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
  async odoo_mrp_productions_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (data.state) domain.push(["state", "=", data.state]);
        if (toInt(data.product_id)) domain.push(["product_id", "=", toInt(data.product_id)]);

        const res = await utils.odooCall(opts, "mrp.production", "search_read", [], {
          domain, fields: ["id", "name", "product_id", "product_qty", "state"], limit
        });
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "mrp.production", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, productions: res.data, totalCount: countRes.data || 0 };
  }
};
