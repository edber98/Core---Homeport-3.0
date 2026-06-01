const { utils } = require("./utils");

module.exports = {
  async cloudflare_kv_namespace_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const accountId = String(d.accountId || "").trim();
    const namespaceId = String(d.namespaceId || "").trim();
    if (!accountId) return { ok: false, error: "ID de compte requis." };
    if (!namespaceId) return { ok: false, error: "ID de namespace requis." };

    const res = await utils.cloudflareRequest(opts, `/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(namespaceId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, success: true, id: namespaceId };
  }
};
