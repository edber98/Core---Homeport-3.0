const { utils } = require("./utils");

module.exports = {
  async get_openproject_project(node, msg, inputs, opts) {
    const id = Number(inputs?.project_id);
    if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Missing project_id." };

    const res = await utils.openprojectRequest(opts, `/projects/${id}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, project: res.data };
  }
};
