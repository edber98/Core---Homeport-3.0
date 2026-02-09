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
  async odoo_ticket_update(node, msg, inputs, opts) {
        const data = inputs || {};
        const id = toInt(data.ticketId);
        if (!id) return { ok: false, error: "Champ ticketId requis." };
        const payload = {};
        if (data.name !== undefined && data.name !== "" && data.name !== null) payload["name"] = data.name;
        if (data.stage_id !== undefined && data.stage_id !== "" && data.stage_id !== null) payload["stage_id"] = data.stage_id;
        if (data.user_id !== undefined && data.user_id !== "" && data.user_id !== null) payload["user_id"] = data.user_id;
        if (data.priority !== undefined && data.priority !== "" && data.priority !== null) payload["priority"] = data.priority;

        const res = await utils.odooCall(opts, "helpdesk.ticket", "write", [[id], payload]);
        if (!res.ok) return res;
        return { ok: true, ticket: res.data };
  }
};
