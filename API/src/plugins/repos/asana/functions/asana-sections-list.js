const { utils } = require("./utils");

module.exports = {
  async asana_sections_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectGid = (d.projectGid || "").trim();
    if (!projectGid) return { ok: false, error: "Missing projectGid." };

    const res = await utils.asanaRequest(opts, `/projects/${encodeURIComponent(projectGid)}/sections`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.data) || [];
    const sections = results.map(r => ({ gid: r.gid || "", name: r.name || "" }));
    return { ok: true, sections };
  }
};
