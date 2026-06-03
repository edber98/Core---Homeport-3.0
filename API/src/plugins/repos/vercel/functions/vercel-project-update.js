const { utils } = require("./utils");
module.exports = {
  async vercel_project_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.projectId) return { ok: false, error: "projectId requis." };
    let settings = {};
    if (d.settings) {
      if (typeof d.settings === "object") settings = d.settings;
      else { try { settings = JSON.parse(String(d.settings)); } catch { return { ok: false, error: "settings JSON invalide." }; } }
    }
    const body = { ...(d.name ? { name: String(d.name) } : {}), ...(d.framework ? { framework: String(d.framework) } : {}), ...settings };
    const res = await utils.vercelRequest(opts, `/v9/projects/${encodeURIComponent(String(d.projectId))}`, { method: "PATCH", query: { teamId: d.teamId }, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: String(r.id || d.projectId), name: r.name || "", status: r.latestDeployments?.[0]?.state || "", url: r.link?.production || "", result_json: utils.compactJson(res.data) };
  }
};
