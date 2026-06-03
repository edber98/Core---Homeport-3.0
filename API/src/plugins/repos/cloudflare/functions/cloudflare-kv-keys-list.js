const { utils } = require("./utils");

module.exports = {
  async cloudflare_kv_keys_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const accountId = String(d.accountId || "").trim();
    const namespaceId = String(d.namespaceId || "").trim();
    if (!accountId) return { ok: false, error: "ID de compte requis." };
    if (!namespaceId) return { ok: false, error: "ID de namespace requis." };

    log("Lecture des clés KV...");
    const res = await utils.cloudflareRequest(opts, `/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(namespaceId)}/keys`, {
      query: { prefix: d.prefix, cursor: d.cursor, limit: utils.toInt(d.pageSize, 100) }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const keys = (Array.isArray(res.data) ? res.data : []).map((k) => ({
      name: k.name,
      expiration: k.expiration,
      metadata: k.metadata ? JSON.stringify(k.metadata) : ""
    }));
    return { ok: true, keys, totalCount: keys.length, cursor: res.resultInfo?.cursor || "" };
  }
};
