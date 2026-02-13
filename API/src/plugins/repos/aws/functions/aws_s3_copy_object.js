const { utils } = require("./utils");

module.exports = {
  async aws_s3_copy_object(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.sourceBucket || !d.sourceKey) return { ok: false, error: "Source bucket et clé requis." };
    if (!d.destBucket || !d.destKey) return { ok: false, error: "Destination bucket et clé requis." };

    log('Appel API en cours...');
    const res = await utils.s3Request(opts, "PUT", `/${d.destBucket}/${encodeURIComponent(d.destKey)}`, {
      headers: { "x-amz-copy-source": `/${d.sourceBucket}/${encodeURIComponent(d.sourceKey)}` }
    });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Objet copié vers ${d.destBucket}/${d.destKey}.` };
  }
};
