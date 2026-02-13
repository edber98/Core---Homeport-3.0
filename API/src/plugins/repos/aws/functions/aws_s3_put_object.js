const { utils } = require("./utils");

module.exports = {
  async aws_s3_put_object(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };
    if (!d.key) return { ok: false, error: "Clé de l'objet requise." };

    let body;
    const fileVal = d.file || d.content;

    if (fileVal && opts.files && typeof fileVal === 'object' && fileVal._type === 'fileRef') {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else if (fileVal && opts.files && typeof fileVal === 'string' && /^https?:\/\//i.test(fileVal)) {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else {
      body = fileVal || "";
    }

    log('Appel API en cours...');
    const res = await utils.s3Request(opts, "PUT", `/${d.bucket}/${encodeURIComponent(d.key)}`, {
      body,
      contentType: d.contentType || "application/octet-stream"
    });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Objet ${d.key} téléversé dans ${d.bucket}.` };
  }
};
