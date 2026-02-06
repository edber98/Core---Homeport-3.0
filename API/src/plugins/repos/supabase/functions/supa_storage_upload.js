const { utils } = require("./utils");

module.exports = {
  async supa_storage_upload(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.bucket || !d.path) return { ok: false, error: "Bucket et chemin requis." };

    const res = await utils.supaStorage(opts, `/object/${d.bucket}/${d.path}`, {
      method: "POST",
      body: d.content || "",
      contentType: d.contentType || "application/octet-stream",
      rawBody: true
    });
    if (!res.ok) return res;
    return {
      ok: true, name: d.path, id: res.data?.Id || res.data?.Key || "",
      bucket: d.bucket, size: "", mimeType: d.contentType || "", createdAt: new Date().toISOString()
    };
  }
};
