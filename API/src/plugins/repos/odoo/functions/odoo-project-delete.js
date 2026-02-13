const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_project_delete(node, msg, inputs, opts) {
    const data = inputs || {};
    const id = toInt(data.projectId);
    if (!id) return { ok: false, error: "Champ projectId requis." };

    const res = await utils.odooCall(opts, "project.project", "unlink", [[id]]);
    if (!res.ok) return res;
    return { ok: true, deleted: true, id };
  }
};
