const { utils } = require("./utils");

module.exports = {
  async clerk_api_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || "GET").toUpperCase();
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "Path requis." };

    const builtQuery = utils.buildObjectFromFields(d.queryFields);
    if (!builtQuery.ok) return builtQuery;
    const builtBody = utils.buildObjectFromFields(d.requestFields);
    if (!builtBody.ok) return builtBody;
    const query = builtQuery.object || {};
    const body = builtBody.object;

    const res = await utils.clerkRequest(opts, path.startsWith("/") ? path : `/${path}`, { method, query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: res.status || 200, message: "Requête exécutée.", raw: res.data || null };
  }
};
