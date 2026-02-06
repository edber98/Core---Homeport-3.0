const { utils } = require("./utils");

module.exports = {
  async aws_s3_list_buckets(node, msg, inputs, opts) {
    const credentials = (opts && opts.credentials) || {};
    const region = credentials.region || "us-east-1";

    const res = await utils.s3Request(opts, "GET", "/");
    if (!res.ok) return res;

    const names = utils.parseXmlTag(res.data, "Name");
    const dates = utils.parseXmlTag(res.data, "CreationDate");

    const buckets = names.map((n, i) => ({ name: n, creationDate: dates[i] || "" }));
    return { ok: true, buckets };
  }
};
