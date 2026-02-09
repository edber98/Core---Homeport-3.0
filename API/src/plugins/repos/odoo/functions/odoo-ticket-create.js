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
  async odoo_ticket_create(node, msg, inputs, opts) {
        const data = inputs || {};
        const payload = {};
        const _name = toStr(data.name);
        if (!_name) return { ok: false, error: "Champ name requis." };
        payload["name"] = _name;
        if (data.partner_id !== undefined && data.partner_id !== "" && data.partner_id !== null) payload["partner_id"] = data.partner_id;
        if (data.team_id !== undefined && data.team_id !== "" && data.team_id !== null) payload["team_id"] = data.team_id;
        if (data.description !== undefined && data.description !== "" && data.description !== null) payload["description"] = data.description;
        if (data.priority !== undefined && data.priority !== "" && data.priority !== null) payload["priority"] = data.priority;

        const res = await utils.odooCall(opts, "helpdesk.ticket", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, ticket: res.data };
  }
};
