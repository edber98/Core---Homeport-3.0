const { utils } = require("./utils");

module.exports = {
  async aws_s3_delete_bucket(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Nom du bucket requis." };

    const res = await utils.s3Request(opts, "DELETE", `/${d.bucket}`);
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Bucket ${d.bucket} supprimé.` };
  }
};
