const { utils } = require("./utils");

module.exports = {
  async aws_sqs_list_queues(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const params = {};
    if (d.prefix) params.QueueNamePrefix = d.prefix;
    if (d.nextToken) params.NextToken = d.nextToken;
    if (d.maxResults) params.MaxResults = String(parseInt(d.maxResults, 10) || 100);

    log("Liste des files SQS...");
    const res = await utils.awsQueryRequest(opts, "sqs", "ListQueues", params, "2012-11-05");
    if (!res.ok) return res;

    const queueUrls = utils.parseXmlTag(res.data, "QueueUrl");
    return {
      ok: true,
      queues: queueUrls.map((url) => ({ url, name: decodeURIComponent(url.split("/").pop() || "") })),
      totalCount: String(queueUrls.length),
      nextToken: utils.parseXmlTagSingle(res.data, "NextToken") || ""
    };
  }
};
