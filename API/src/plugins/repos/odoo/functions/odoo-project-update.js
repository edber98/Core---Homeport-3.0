const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_project_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const id = toInt(data.projectId);
    if (!id) return { ok: false, error: "Champ projectId requis." };

    const payload = {};
    if (data.name) payload.name = data.name;
    if (data.description) payload.description = data.description;
    if (toInt(data.partner_id)) payload.partner_id = toInt(data.partner_id);
    if (toInt(data.user_id)) payload.user_id = toInt(data.user_id);
    if (data.active !== undefined && data.active !== "") payload.active = data.active === true || data.active === "true";

    if (!Object.keys(payload).length) return { ok: false, error: "Aucun champ à mettre à jour." };

    const res = await utils.odooCall(opts, "project.project", "write", [[id], payload]);
    if (!res.ok) return res;
    return { ok: true, updated: true, id };
  }
};
