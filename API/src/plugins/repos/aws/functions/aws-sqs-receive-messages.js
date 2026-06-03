const { utils } = require("./utils");

module.exports = {
  async aws_sqs_receive_messages(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.queueUrl) return { ok: false, error: "URL de file requise." };

    const params = {
      QueueUrl: d.queueUrl,
      MaxNumberOfMessages: String(parseInt(d.maxNumberOfMessages, 10) || 1),
      WaitTimeSeconds: String(parseInt(d.waitTimeSeconds, 10) || 0)
    };
    if (d.visibilityTimeout !== undefined && d.visibilityTimeout !== "") {
      params.VisibilityTimeout = String(parseInt(d.visibilityTimeout, 10) || 30);
    }
    params["AttributeName.1"] = "All";
    params["MessageAttributeName.1"] = "All";

    log("Réception des messages SQS...");
    const res = await utils.awsQueryRequest(opts, "sqs", "ReceiveMessage", params, "2012-11-05");
    if (!res.ok) return res;

    const blocks = utils.parseXmlTag(res.data, "Message");
    const messages = blocks.map((block) => ({
      messageId: utils.parseXmlTagSingle(block, "MessageId") || "",
      receiptHandle: utils.parseXmlTagSingle(block, "ReceiptHandle") || "",
      body: utils.parseXmlTagSingle(block, "Body") || "",
      md5OfBody: utils.parseXmlTagSingle(block, "MD5OfBody") || ""
    }));
    return { ok: true, messages, totalCount: String(messages.length) };
  }
};
