const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_companies_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const limit = toInt(data.limit) || 50;
    const domain = [];

    const res = await utils.odooCall(opts, "res.company", "search_read", [], { domain, limit });
    if (!res.ok) return res;
    const countRes = await utils.odooCall(opts, "res.company", "search_count", [], { domain });
    if (!countRes.ok) return countRes;
    return { ok: true, companies: res.data, totalCount: countRes.data || 0 };
  }
};
