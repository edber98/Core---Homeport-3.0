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
  async odoo_task_create(node, msg, inputs, opts) {
    const data = inputs || {};
    const name = toStr(data.name);
    if (!name) return { ok: false, error: "Champ name requis." };
    const project_id = toInt(data.project_id);
    if (!project_id) return { ok: false, error: "Champ project_id requis." };

    const payload = { name, project_id };
    if (data.description) payload.description = data.description;
    if (data.date_deadline) payload.date_deadline = data.date_deadline;
    if (toInt(data.stage_id)) payload.stage_id = toInt(data.stage_id);
    if (data.user_ids) {
      const ids = String(data.user_ids).split(",").map(s => parseInt(s.trim(), 10)).filter(Number.isFinite);
      if (ids.length) payload.user_ids = [[6, 0, ids]];
    }

    const res = await utils.odooCall(opts, "project.task", "create", [payload]);
    if (!res.ok) return res;
    return { ok: true, task: res.data };
  }
};
