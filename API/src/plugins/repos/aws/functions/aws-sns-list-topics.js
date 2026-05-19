const { utils } = require("./utils");

module.exports = {
  async aws_sns_list_topics(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const params = {};
    if (d.nextToken) params.NextToken = d.nextToken;

    log("Liste des topics SNS...");
    const res = await utils.awsQueryRequest(opts, "sns", "ListTopics", params, "2010-03-31");
    if (!res.ok) return res;

    const topics = utils.parseXmlTag(res.data, "TopicArn").map((arn) => ({
      topicArn: arn,
      name: arn.split(":").pop() || ""
    }));
    return {
      ok: true,
      topics,
      totalCount: String(topics.length),
      nextToken: utils.parseXmlTagSingle(res.data, "NextToken") || ""
    };
  }
};
