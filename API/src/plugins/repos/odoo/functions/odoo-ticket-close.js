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
  async odoo_ticket_close(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const id = toInt(data.ticketId);
    if (!id) return { ok: false, error: "Champ ticketId requis." };

    const res = await utils.odooCall(opts, "helpdesk.ticket", "action_close", [[id]]);
    if (!res.ok) return res;
    return { ok: true, ticket: res.data };
  }
};
