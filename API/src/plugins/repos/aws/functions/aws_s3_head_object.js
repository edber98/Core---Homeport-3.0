const { utils } = require("./utils");

module.exports = {
  async aws_s3_head_object(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };
    if (!d.key) return { ok: false, error: "Clé de l'objet requise." };

    const res = await utils.s3Request(opts, "HEAD", `/${d.bucket}/${encodeURIComponent(d.key)}`);
    if (!res.ok) return res;
    const h = res.headers || {};
    return {
      ok: true, key: d.key, bucket: d.bucket,
      size: h["content-length"] || "", lastModified: h["last-modified"] || "",
      etag: (h["etag"] || "").replace(/"/g, ""),
      contentType: h["content-type"] || "", storageClass: h["x-amz-storage-class"] || "STANDARD"
    };
  }
};
