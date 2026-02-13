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
  async odoo_partners_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (data.is_company) domain.push(["is_company", "=", true]);
        if (data.domain) { try { domain.push(...JSON.parse(data.domain)); } catch(e) {} }

        const res = await utils.odooCall(opts, "res.partner", "search_read", [], {
          domain, limit
        });
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "res.partner", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, partners: res.data, totalCount: countRes.data || 0 };
  }
};
