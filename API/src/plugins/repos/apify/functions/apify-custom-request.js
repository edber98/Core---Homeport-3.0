const { utils } = require("./utils");

module.exports = {
  async apify_custom_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || "GET").toUpperCase();
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "path requis." };
    let query = {};
    let body = undefined;
    try { query = utils.parseJsonInput(d.query, "query", {}); } catch (e) { return { ok: false, error: e.message }; }
    try { body = utils.parseJsonInput(d.body, "body", undefined); } catch (e) { return { ok: false, error: e.message }; }
    const res = await utils.apifyRequest(opts, path.startsWith("/") ? path : `/${path}`, { method, query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data?.data || res.data || {};
    return {
      ok: true,
      id: String(r.id || r.key || ""),
      status: r.status || r.state || "",
      name: r.name || r.title || "",
      url: r.url || "",
      text: r.description || r.message || "",
      result_json: utils.compactJson(res.data)
    };
  }
};
