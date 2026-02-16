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
  async odoo_products_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (data.type) domain.push(["type", "=", data.type]);

        const res = await utils.odooCall(opts, "product.product", "search_read", [], {
          domain, limit
        });
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "product.product", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, products: res.data, totalCount: countRes.data || 0 };
  }
};
