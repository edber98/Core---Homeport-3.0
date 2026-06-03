const { utils } = require("./utils");

module.exports = {
  async aws_sns_publish_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.message) return { ok: false, error: "Message requis." };
    if (!d.topicArn && !d.phoneNumber && !d.targetArn) {
      return { ok: false, error: "Topic ARN, téléphone ou target ARN requis." };
    }

    const params = { Message: d.message };
    if (d.topicArn) params.TopicArn = d.topicArn;
    if (d.phoneNumber) params.PhoneNumber = d.phoneNumber;
    if (d.targetArn) params.TargetArn = d.targetArn;
    if (d.subject) params.Subject = d.subject;

    log("Publication SNS...");
    const res = await utils.awsQueryRequest(opts, "sns", "Publish", params, "2010-03-31");
    if (!res.ok) return res;
    return {
      ok: true,
      messageId: utils.parseXmlTagSingle(res.data, "MessageId") || "",
      status: "published"
    };
  }
};
