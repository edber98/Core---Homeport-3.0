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
  async odoo_lead_update(node, msg, inputs, opts) {
        const data = inputs || {};
        const id = toInt(data.leadId);
        if (!id) return { ok: false, error: "Champ leadId requis." };
        const payload = {};
        if (data.name !== undefined && data.name !== "" && data.name !== null) payload["name"] = data.name;
        if (data.stage_id !== undefined && data.stage_id !== "" && data.stage_id !== null) payload["stage_id"] = data.stage_id;
        if (data.expected_revenue !== undefined && data.expected_revenue !== "" && data.expected_revenue !== null) payload["expected_revenue"] = data.expected_revenue;

        const res = await utils.odooCall(opts, "crm.lead", "write", [[id], payload]);
        if (!res.ok) return res;
        return { ok: true, lead: res.data };
  }
};
