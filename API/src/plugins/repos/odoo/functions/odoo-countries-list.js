const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_countries_list(node, msg, inputs, opts) {
    const data = inputs || {};
    const limit = toInt(data.limit) || 300;
    const domain = [];

    const res = await utils.odooCall(opts, "res.country", "search_read", [], { domain, limit });
    if (!res.ok) return res;
    const countRes = await utils.odooCall(opts, "res.country", "search_count", [], { domain });
    if (!countRes.ok) return countRes;
    return { ok: true, countries: res.data, totalCount: countRes.data || 0 };
  }
};
