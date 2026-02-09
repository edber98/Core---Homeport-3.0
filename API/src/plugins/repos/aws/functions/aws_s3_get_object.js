const { utils } = require("./utils");

module.exports = {
  async aws_s3_get_object(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };
    if (!d.key) return { ok: false, error: "Clé de l'objet requise." };

    const res = await utils.s3Request(opts, "GET", `/${d.bucket}/${encodeURIComponent(d.key)}`, { rawResponse: true });
    if (!res.ok) return res;
    return {
      ok: true, key: d.key, bucket: d.bucket,
      contentType: res.contentType, content: res.data,
      size: res.data ? String(Buffer.from(res.data, "base64").length) : "0"
    };
  }
};
