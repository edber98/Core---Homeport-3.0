const { utils } = require("./utils");

module.exports = {
  async aws_s3_get_object(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };
    if (!d.key) return { ok: false, error: "Clé de l'objet requise." };

    log('Récupération des données...');
    const res = await utils.s3Request(opts, "GET", `/${d.bucket}/${encodeURIComponent(d.key)}`, { rawResponse: true });
    if (!res.ok) return res;

    const name = d.key.split("/").pop() || "file";
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
      ok: true, key: d.key, bucket: d.bucket,
      contentType: mimeType,
      size: res.data ? String(Buffer.from(res.data, "base64").length) : "0",
      file
    };
  }
};
