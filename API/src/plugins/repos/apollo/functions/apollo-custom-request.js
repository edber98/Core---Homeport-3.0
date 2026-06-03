const { utils } = require("./utils");

module.exports = {
  async apollo_custom_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || "GET").toUpperCase();
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "path requis." };
    let query = {};
    let body = undefined;
    try { query = utils.parseJsonInput(d.query, "query", {}); } catch (e) { return { ok: false, error: e.message }; }
    try { body = utils.parseJsonInput(d.body, "body", undefined); } catch (e) { return { ok: false, error: e.message }; }
    const res = await utils.apiRequest(opts, path.startsWith("/") ? path : `/${path}`, { method, query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.responseResult(res.data);
  }
};
