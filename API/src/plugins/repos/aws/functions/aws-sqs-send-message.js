const { utils } = require("./utils");

module.exports = {
  async aws_sqs_send_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.queueUrl) return { ok: false, error: "URL de file requise." };
    if (!d.messageBody) return { ok: false, error: "Message requis." };

    const params = {
      QueueUrl: d.queueUrl,
      MessageBody: d.messageBody
    };
    if (d.delaySeconds !== undefined && d.delaySeconds !== "") params.DelaySeconds = String(parseInt(d.delaySeconds, 10) || 0);
    if (d.messageGroupId) params.MessageGroupId = d.messageGroupId;
    if (d.messageDeduplicationId) params.MessageDeduplicationId = d.messageDeduplicationId;

    log("Envoi du message SQS...");
    const res = await utils.awsQueryRequest(opts, "sqs", "SendMessage", params, "2012-11-05");
    if (!res.ok) return res;
    return {
      ok: true,
      messageId: utils.parseXmlTagSingle(res.data, "MessageId") || "",
      md5OfBody: utils.parseXmlTagSingle(res.data, "MD5OfMessageBody") || "",
      status: "sent"
    };
  }
};
