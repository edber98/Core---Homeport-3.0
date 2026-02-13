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
  async odoo_tickets_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (toInt(data.team_id)) domain.push(["team_id", "=", toInt(data.team_id)]);
        if (toInt(data.stage_id)) domain.push(["stage_id", "=", toInt(data.stage_id)]);
        if (data.priority) domain.push(["priority", "=", data.priority]);

        const res = await utils.odooCall(opts, "helpdesk.ticket", "search_read", [], {
          domain, limit
        });
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "helpdesk.ticket", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, tickets: res.data, totalCount: countRes.data || 0 };
  }
};
