const { utils } = require("./utils");

module.exports = {
  async aws_s3_list_objects(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.bucket) return { ok: false, error: "Bucket requis." };

    const params = new URLSearchParams({ "list-type": "2" });
    if (d.prefix) params.set("prefix", d.prefix);
    if (d.maxKeys) params.set("max-keys", String(d.maxKeys));

    const res = await utils.s3Request(opts, "GET", `/${d.bucket}?${params}`);
    if (!res.ok) return res;

    const keys = utils.parseXmlTag(res.data, "Key");
    const sizes = utils.parseXmlTag(res.data, "Size");
    const dates = utils.parseXmlTag(res.data, "LastModified");
    const etags = utils.parseXmlTag(res.data, "ETag");
    const classes = utils.parseXmlTag(res.data, "StorageClass");

    const objects = keys.map((k, i) => ({
      key: k, bucket: d.bucket, size: sizes[i] || "", lastModified: dates[i] || "",
      etag: (etags[i] || "").replace(/"/g, ""), storageClass: classes[i] || ""
    }));

    const keyCount = parseInt(utils.parseXmlTagSingle(res.data, "KeyCount") || "0", 10) || objects.length;
    const isTruncated = utils.parseXmlTagSingle(res.data, "IsTruncated") === "true";
    const nextToken = utils.parseXmlTagSingle(res.data, "NextContinuationToken") || "";
    return { ok: true, objects, totalCount: keyCount, isTruncated, nextToken };
  }
};
