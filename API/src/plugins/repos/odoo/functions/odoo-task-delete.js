const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_task_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = inputs || {};
    const id = toInt(data.taskId);
    if (!id) return { ok: false, error: "Champ taskId requis." };

    const res = await utils.odooCall(opts, "project.task", "unlink", [[id]]);
    if (!res.ok) return res;
    return { ok: true, deleted: true, id };
  }
};
