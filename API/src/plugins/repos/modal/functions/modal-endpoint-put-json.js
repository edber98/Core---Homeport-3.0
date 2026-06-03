const { utils } = require("./utils");

module.exports = {
  async modal_endpoint_put_json(node, msg, inputs, opts) {
    const d = inputs || {};
    const url = String(d.url || "").trim();
    if (!url) return { ok: false, error: "URL requise." };

    let headers; let query; let body;
    try {
      headers = utils.parseJsonInput(d.headers, "headers", {});
      query = utils.parseJsonInput(d.query, "query", {});
      body = utils.parseJsonInput(d.body, "body", {});
    } catch (e) { return { ok: false, error: e.message }; }

    const res = await utils.providerRequest(opts, url, { method: "PUT", headers, query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id: "", name: "", url, status: "success", created_at: "", updated_at: "", raw: res.data };
  }
};
