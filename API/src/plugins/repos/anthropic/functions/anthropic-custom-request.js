const { utils } = require("./utils");

module.exports = {
  async anthropic_custom_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || "GET").toUpperCase();
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "path requis." };
    let query = {};
    let body = undefined;
    let headers = {};
    try { query = utils.parseJsonInput(d.query, "query", {}); } catch (e) { return { ok: false, error: e.message }; }
    try { headers = utils.parseJsonInput(d.headers, "headers", {}); } catch (e) { return { ok: false, error: e.message }; }
    try { body = utils.parseJsonInput(d.body, "body", undefined); } catch (e) { return { ok: false, error: e.message }; }
    const res = await utils.anthropicRequest(opts, path.startsWith("/") ? path : `/${path}`, { method, query, body, headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: "", text: "", data: res.data || null };
  }
};
