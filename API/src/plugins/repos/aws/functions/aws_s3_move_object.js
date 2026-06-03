const { utils } = require("./utils");

module.exports = {
  async aws_s3_move_object(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.sourceBucket || !d.sourceKey) return { ok: false, error: "sourceBucket et sourceKey requis." };
    if (!d.destinationBucket || !d.destinationKey) return { ok: false, error: "destinationBucket et destinationKey requis." };

    const copySource = `${d.sourceBucket}/${d.sourceKey}`;
    const copyRes = await utils.s3Request(opts, "PUT", `/${d.destinationBucket}/${encodeURIComponent(d.destinationKey)}`, {
      headers: { "x-amz-copy-source": encodeURIComponent(copySource) }
    });
    if (!copyRes.ok) return copyRes;

    const delRes = await utils.s3Request(opts, "DELETE", `/${d.sourceBucket}/${encodeURIComponent(d.sourceKey)}`);
    if (!delRes.ok) return delRes;

    return { ok: true, status: "success", message: `Objet déplacé vers ${d.destinationBucket}/${d.destinationKey}.` };
  }
};
