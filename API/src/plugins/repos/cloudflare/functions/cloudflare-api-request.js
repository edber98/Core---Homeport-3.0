const { utils } = require("./utils");

module.exports = {
  async cloudflare_api_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || "GET").toUpperCase();
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "Path requis." };

    let query = {};
    try { query = utils.parseJsonInput(d.query, "query") || {}; } catch (e) { return { ok: false, error: e.message }; }
    const builtBody = utils.buildObjectFromFields(d.requestFields);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.object;

    const reqPath = path.startsWith("/") ? path : `/${path}`;
    const res = await utils.cloudflareRequest(opts, reqPath, { method, query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: String(res.status || "200"), message: "Requête exécutée.", raw: res.data || null };
  }
};
