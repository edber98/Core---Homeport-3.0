const { utils } = require("./utils");

module.exports = {
  async aws_s3_delete_object(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };
    if (!d.key) return { ok: false, error: "Clé de l'objet requise." };

    log('Suppression en cours...');
    const res = await utils.s3Request(opts, "DELETE", `/${d.bucket}/${encodeURIComponent(d.key)}`);
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Objet ${d.key} supprimé de ${d.bucket}.` };
  }
};
