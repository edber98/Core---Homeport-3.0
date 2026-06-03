const { utils } = require("./utils");

module.exports = {
  async huggingface_space_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const repoId = String(d.repoId || "").trim();
    if (!repoId) return { ok: false, error: "repoId requis." };
    const res = await utils.huggingfaceRequest(opts, `/api/spaces/${encodeURIComponent(repoId)}`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: String(r.id || repoId), status: r.status || r.type || "", name: r.name || r.title || repoId, url: r.url || r.html_url || `https://huggingface.co/spaces/${repoId}`, text: r.description || "", result_json: utils.compactJson(res.data) };
  }
};
