const { utils } = require("./utils");

module.exports = {
  async asana_section_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const projectGid = (d.projectGid || "").trim();
    const name = (d.name || "").trim();
    if (!projectGid) return { ok: false, error: "Missing projectGid." };
    if (!name) return { ok: false, error: "Missing name." };

    log('Création en cours...');
    const res = await utils.asanaRequest(opts, `/projects/${encodeURIComponent(projectGid)}/sections`, {
      method: "POST", body: { data: { name } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return { ok: true, gid: r.gid || "", name: r.name || "", project: projectGid };
  }
};
