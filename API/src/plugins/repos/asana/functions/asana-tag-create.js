const { utils } = require("./utils");

module.exports = {
  async asana_tag_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const workspaceGid = (d.workspaceGid || "").trim();
    const name = (d.name || "").trim();
    if (!workspaceGid) return { ok: false, error: "Missing workspaceGid." };
    if (!name) return { ok: false, error: "Missing name." };

    const data = { name, workspace: workspaceGid };
    if (d.color) data.color = d.color;

    const res = await utils.asanaRequest(opts, "/tags", { method: "POST", body: { data } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return { ok: true, gid: r.gid || "", name: r.name || "", color: r.color || "" };
  }
};
