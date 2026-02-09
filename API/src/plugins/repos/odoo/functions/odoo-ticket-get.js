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
  async odoo_ticket_get(node, msg, inputs, opts) {
    const data = inputs || {};
    const id = toInt(data.ticketId);
    if (!id) return { ok: false, error: "Champ ticketId requis." };

    const res = await utils.odooCall(opts, "helpdesk.ticket", "read", [[id]], { fields: ["id", "name", "partner_id", "team_id", "stage_id", "priority", "description"] });
    if (!res.ok) return res;
    const record = Array.isArray(res.data) ? res.data[0] || null : res.data;
    return { ok: true, ticket: record };
  }
};
