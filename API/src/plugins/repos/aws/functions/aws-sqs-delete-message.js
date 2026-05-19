const { utils } = require("./utils");

module.exports = {
  async aws_sqs_delete_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.queueUrl) return { ok: false, error: "URL de file requise." };
    if (!d.receiptHandle) return { ok: false, error: "Receipt handle requis." };

    log("Suppression du message SQS...");
    const res = await utils.awsQueryRequest(opts, "sqs", "DeleteMessage", {
      QueueUrl: d.queueUrl,
      ReceiptHandle: d.receiptHandle
    }, "2012-11-05");
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: "Message SQS supprimé." };
  }
};
