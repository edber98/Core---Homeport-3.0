const { utils } = require("./utils");

module.exports = {
  async modal_endpoint_invoke_http(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};

    const url = String(d.url || "").trim();
    if (!url) return { ok: false, error: "URL requise." };

    const method = String(d.method || "POST").trim().toUpperCase();
    const allowed = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
    if (!allowed.has(method)) {
      return { ok: false, error: "Méthode HTTP non supportée." };
    }

    let headers;
    let query;
    let body;
    try {
      headers = utils.parseJsonInput(d.requestHeaders, "requestHeaders", {});
      query = utils.parseJsonInput(d.queryParameters, "queryParameters", {});
      body = utils.parseJsonInput(d.requestBody, "requestBody", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log("Appel endpoint Modal en cours...");
    const res = await utils.providerRequest(opts, url, { method, headers, query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data;
    const ref = (payload && typeof payload === "object" && !Array.isArray(payload)) ? payload : {};

    return {
      ok: true,
      id: ref.id || ref.request_id || ref.call_id || "",
      name: ref.name || ref.label || "",
      url,
      status: ref.status || "success",
      created_at: ref.created_at || ref.createdAt || "",
      updated_at: ref.updated_at || ref.updatedAt || "",
      raw: payload
    };
  }
};
