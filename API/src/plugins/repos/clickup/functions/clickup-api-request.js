const { utils } = require("./utils");

function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

module.exports = {
  async clickup_api_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const method = String(d.method || "GET").toUpperCase();
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "Missing path." };

    let query = {};
    let headers = {};
    let body;
    try {
      query = parseJson(d.query, "query", {});
      headers = parseJson(d.headers, "headers", {});
      body = parseJson(d.body, "body", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const apiPath = path.startsWith("/") ? path : `/${path}`;
    const res = await utils.clickupRequest(opts, apiPath, { method, query, headers, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "ok", message: "Requête exécutée.", raw: res.data || null };
  }
};
