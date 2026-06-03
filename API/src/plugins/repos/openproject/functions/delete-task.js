const { utils } = require("./utils");

module.exports = {
  async delete_openproject_task(node, msg, inputs, opts) {
    const id = Number(inputs?.task_id);
    if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Missing task_id." };

    const res = await utils.openprojectRequest(opts, `/work_packages/${id}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id, status: "deleted" };
  }
};
