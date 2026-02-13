const { utils } = require("./utils");

module.exports = {
  async supa_storage_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };

    const body = { prefix: d.prefix || "", limit: d.limit || 100 };
    const res = await utils.supaStorage(opts, `/object/list/${d.bucket}`, {
      method: "POST", body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) return res;
    const files = (Array.isArray(res.data) ? res.data : []).map(f => ({
      name: f.name || "", id: f.id || "", bucket: d.bucket,
      size: f.metadata?.size != null ? String(f.metadata.size) : "",
      mimeType: f.metadata?.mimetype || ""
    }));
    return { ok: true, files };
  }
};
