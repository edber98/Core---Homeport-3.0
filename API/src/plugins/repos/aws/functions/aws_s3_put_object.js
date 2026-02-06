const { utils } = require("./utils");

module.exports = {
  async aws_s3_put_object(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };
    if (!d.key) return { ok: false, error: "Clé de l'objet requise." };

    const res = await utils.s3Request(opts, "PUT", `/${d.bucket}/${encodeURIComponent(d.key)}`, {
      body: d.content || "",
      contentType: d.contentType || "application/octet-stream"
    });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Objet ${d.key} téléversé dans ${d.bucket}.` };
  }
};
