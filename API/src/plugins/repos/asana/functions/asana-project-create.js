const { utils } = require("./utils");

module.exports = {
  async asana_project_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const workspaceGid = (d.workspaceGid || "").trim();
    const name = (d.name || "").trim();
    if (!workspaceGid) return { ok: false, error: "Missing workspaceGid." };
    if (!name) return { ok: false, error: "Missing name." };

    const data = { name, workspace: workspaceGid };
    if (d.notes) data.notes = d.notes;
    if (d.color) data.color = d.color;

    log('Création en cours...');
    const res = await utils.asanaRequest(opts, "/projects", { method: "POST", body: { data } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return {
      ok: true, gid: r.gid || "", name: r.name || "", notes: r.notes || "",
      color: r.color || "", workspace: workspaceGid, created_at: r.created_at || ""
    };
  }
};
