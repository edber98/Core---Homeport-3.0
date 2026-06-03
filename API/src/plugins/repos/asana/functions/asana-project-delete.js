const { utils } = require("./utils");

module.exports = {
  async asana_project_delete(node, msg, inputs, opts) {
    const projectGid = (inputs && inputs.projectGid ? inputs.projectGid : "").trim();
    if (!projectGid) return { ok: false, error: "Missing projectGid." };

    const res = await utils.asanaRequest(opts, `/projects/${encodeURIComponent(projectGid)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", gid: projectGid };
  }
};
