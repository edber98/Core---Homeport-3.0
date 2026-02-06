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
  async odoo_leads_list(node, msg, inputs, opts) {
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (toInt(data.stage_id)) domain.push(["stage_id", "=", toInt(data.stage_id)]);
        if (data.type) domain.push(["type", "=", data.type]);

        const res = await utils.odooCall(opts, "crm.lead", "search_read", [], {
          domain, fields: ["id", "name", "partner_id", "email_from", "phone", "expected_revenue", "stage_id", "type"], limit
        });
        if (!res.ok) return res;
        return { ok: true, leads: res.data };
  }
};
