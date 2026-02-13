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
  async odoo_lead_get(node, msg, inputs, opts) {
    const data = inputs || {};
    const id = toInt(data.leadId);
    if (!id) return { ok: false, error: "Champ leadId requis." };

    const res = await utils.odooCall(opts, "crm.lead", "read", [[id]], {});
    if (!res.ok) return res;
    const record = Array.isArray(res.data) ? res.data[0] || null : res.data;
    return { ok: true, lead: record };
  }
};
