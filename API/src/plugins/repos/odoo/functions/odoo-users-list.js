const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_users_list(node, msg, inputs, opts) {
    const data = inputs || {};
    const limit = toInt(data.limit) || 50;
    const domain = [];
    if (data.active !== undefined && data.active !== "") {
      domain.push(["active", "=", data.active === true || data.active === "true"]);
    }

    const res = await utils.odooCall(opts, "res.users", "search_read", [], { domain, limit });
    if (!res.ok) return res;
    const countRes = await utils.odooCall(opts, "res.users", "search_count", [], { domain });
    if (!countRes.ok) return countRes;
    return { ok: true, users: res.data, totalCount: countRes.data || 0 };
  }
};
