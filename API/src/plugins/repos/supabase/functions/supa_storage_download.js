const { utils } = require("./utils");

module.exports = {
  async supa_storage_download(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.bucket || !d.path) return { ok: false, error: "Bucket et chemin requis." };

    const res = await utils.supaStorage(opts, `/object/${d.bucket}/${d.path}`, { rawResponse: true });
    if (!res.ok) return res;

    const name = d.path.split("/").pop() || "file";
    const mimeType = res.contentType || "application/octet-stream";

    let file = null;
    if (opts.files && res.data) {
      file = await opts.files.store(res.data, {
        name,
        mimeType: mimeType.split(";")[0].trim(),
        lifecycle: "execution"
      });
    }

    return {
      ok: true, name: d.path, id: "", bucket: d.bucket,
      size: res.data ? String(Buffer.from(res.data, "base64").length) : "0",
      mimeType, createdAt: "", file
    };
  }
};
