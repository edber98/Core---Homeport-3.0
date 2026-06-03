const { utils } = require("./utils");

module.exports = {
  async cloudflare_kv_namespace_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const accountId = String(d.accountId || "").trim();
    const title = String(d.title || "").trim();
    if (!accountId) return { ok: false, error: "ID de compte requis." };
    if (!title) return { ok: false, error: "Titre namespace requis." };

    const res = await utils.cloudflareRequest(opts, `/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces`, {
      method: "POST",
      body: { title }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactKvNamespace(res.data || {}) };
  }
};
