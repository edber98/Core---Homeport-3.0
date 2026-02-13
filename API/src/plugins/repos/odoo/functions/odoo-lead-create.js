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
  async odoo_lead_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
        const data = inputs || {};
        const payload = {};
        const _name = toStr(data.name);
        if (!_name) return { ok: false, error: "Champ name requis." };
        payload["name"] = _name;
        if (data.partner_id !== undefined && data.partner_id !== "" && data.partner_id !== null) payload["partner_id"] = data.partner_id;
        if (data.email_from !== undefined && data.email_from !== "" && data.email_from !== null) payload["email_from"] = data.email_from;
        if (data.phone !== undefined && data.phone !== "" && data.phone !== null) payload["phone"] = data.phone;
        if (data.expected_revenue !== undefined && data.expected_revenue !== "" && data.expected_revenue !== null) payload["expected_revenue"] = data.expected_revenue;
        if (data.stage_id !== undefined && data.stage_id !== "" && data.stage_id !== null) payload["stage_id"] = data.stage_id;

        const res = await utils.odooCall(opts, "crm.lead", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, lead: res.data };
  }
};
