const { utils } = require("./utils");

module.exports = {
  async datadog_api_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || "GET").toUpperCase();
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "Path requis." };

    let query = {};
    let body;
    try {
      query = utils.parseJson(d.queryParametersJson, "query", {});
      body = utils.parseJson(d.requestBodyJson, "body", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const reqPath = path.startsWith("/") ? path : `/${path}`;
    const requireAppKey = d.requireAppKey === undefined || d.requireAppKey === null || d.requireAppKey === "" ? true : utils.boolValue(d.requireAppKey);
    const res = await utils.datadogRequest(opts, reqPath, { method, query, body, requireAppKey });
    if (!res.ok) return res;
    return { ok: true, success: "true", message: "Requête exécutée.", raw: res.data || null };
  }
};
