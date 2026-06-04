const { utils } = require("./utils");

module.exports = {
  async crisp_api_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || "GET").toUpperCase();
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "Path requis." };

    let query = {};
    let body;
    try {
      query = utils.parseJsonInput(d.queryParametersJson, "query", {});
      body = utils.parseJsonInput(d.requestBodyJson, "body", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const reqPath = path.startsWith("/") ? path : `/${path}`;
    const res = await utils.crispRequest(opts, reqPath, { method, query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: "", status: String(res.status || "200"), name: "", url: "", text: "", result_json: utils.compactJson(res.data) };
  }
};
