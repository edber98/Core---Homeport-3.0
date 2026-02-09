const { utils } = require("./utils");

module.exports = {
  async supa_storage_download(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.bucket || !d.path) return { ok: false, error: "Bucket et chemin requis." };

    const res = await utils.supaStorage(opts, `/object/${d.bucket}/${d.path}`, { rawResponse: true });
    if (!res.ok) return res;
    return {
      ok: true, name: d.path, id: "", bucket: d.bucket,
      size: res.data ? String(Buffer.from(res.data, "base64").length) : "0",
      mimeType: res.contentType || "", createdAt: "", content: res.data
    };
  }
};
