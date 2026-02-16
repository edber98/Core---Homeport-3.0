const { utils } = require("./utils");

module.exports = {
  async aws_s3_create_bucket(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Nom du bucket requis." };

    const credentials = (opts && opts.credentials) || {};
    const region = d.region || credentials.region || "us-east-1";
    let body = "";
    if (region !== "us-east-1") {
      body = `<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><LocationConstraint>${region}</LocationConstraint></CreateBucketConfiguration>`;
    }

    log('Création en cours...');
    const res = await utils.s3Request(opts, "PUT", `/${d.bucket}`, { body: body || undefined });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Bucket ${d.bucket} créé.` };
  }
};
