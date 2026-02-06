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
  async odoo_project_create(node, msg, inputs, opts) {
        const data = inputs || {};
        const payload = {};
        const _name = toStr(data.name);
        if (!_name) return { ok: false, error: "Champ name requis." };
        payload["name"] = _name;
        if (data.description !== undefined && data.description !== "" && data.description !== null) payload["description"] = data.description;
        if (data.partner_id !== undefined && data.partner_id !== "" && data.partner_id !== null) payload["partner_id"] = data.partner_id;

        const res = await utils.odooCall(opts, "project.project", "create", [payload]);
        if (!res.ok) return res;
        return { ok: true, project: res.data };
  }
};
