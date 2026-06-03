const { utils } = require("./utils");

module.exports = {
  async cloudflare_kv_namespaces_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const accountId = String(d.accountId || "").trim();
    if (!accountId) return { ok: false, error: "ID de compte requis." };

    log("Lecture des namespaces KV...");
    const res = await utils.cloudflareRequest(opts, `/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces`, {
      query: { page: utils.toInt(d.page, 1), per_page: utils.toInt(d.pageSize, 50), direction: "asc" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const namespaces = (Array.isArray(res.data) ? res.data : []).map(utils.compactKvNamespace);
    return { ok: true, namespaces, totalCount: res.resultInfo?.total_count || namespaces.length };
  }
};
