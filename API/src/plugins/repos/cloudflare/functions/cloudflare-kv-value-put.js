const { utils } = require("./utils");

module.exports = {
  async cloudflare_kv_value_put(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const accountId = String(d.accountId || "").trim();
    const namespaceId = String(d.namespaceId || "").trim();
    const key = String(d.key || "").trim();
    if (!accountId) return { ok: false, error: "ID de compte requis." };
    if (!namespaceId) return { ok: false, error: "ID de namespace requis." };
    if (!key) return { ok: false, error: "Clé KV requise." };

    const query = {};
    if (d.expirationTtl) query.expiration_ttl = parseInt(d.expirationTtl, 10);
    if (d.metadata) query.metadata = String(d.metadata);

    log("Écriture de la valeur KV...");
    const res = await utils.cloudflareRequest(opts, `/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(namespaceId)}/values/${encodeURIComponent(key)}`, {
      method: "PUT",
      query,
      rawBody: true,
      body: String(d.value || ""),
      headers: { "Content-Type": d.contentType || "text/plain" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, key, success: true };
  }
};
