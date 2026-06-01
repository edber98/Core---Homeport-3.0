const { utils } = require("./utils");

module.exports = {
  async apify_kv_record_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.storeId) return { ok: false, error: "storeId requis." };
    if (!d.recordKey) return { ok: false, error: "recordKey requis." };
    const path = `/key-value-stores/${encodeURIComponent(String(d.storeId))}/records/${encodeURIComponent(String(d.recordKey))}`;
    const res = await utils.apifyRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: String(d.recordKey), status: "deleted", name: "", url: "", text: "Record supprimé.", result_json: utils.compactJson(res.data) };
  }
};
