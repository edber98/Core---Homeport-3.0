const { utils } = require("./utils");

module.exports = {
  async cloudflare_kv_value_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const accountId = String(d.accountId || "").trim();
    const namespaceId = String(d.namespaceId || "").trim();
    const key = String(d.key || "").trim();
    if (!accountId) return { ok: false, error: "ID de compte requis." };
    if (!namespaceId) return { ok: false, error: "ID de namespace requis." };
    if (!key) return { ok: false, error: "Clé KV requise." };

    const res = await utils.cloudflareRequest(opts, `/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(namespaceId)}/values/${encodeURIComponent(key)}`, { rawText: true });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, key, value: res.data };
  }
};
