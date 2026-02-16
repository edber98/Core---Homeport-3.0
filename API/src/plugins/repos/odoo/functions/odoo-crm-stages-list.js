const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_crm_stages_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const limit = toInt(data.limit) || 100;
    const domain = [];
    if (toInt(data.team_id)) domain.push(["team_id", "=", toInt(data.team_id)]);

    const res = await utils.odooCall(opts, "crm.stage", "search_read", [], { domain, limit });
    if (!res.ok) return res;
    const countRes = await utils.odooCall(opts, "crm.stage", "search_count", [], { domain });
    if (!countRes.ok) return countRes;
    return { ok: true, stages: res.data, totalCount: countRes.data || 0 };
  }
};
