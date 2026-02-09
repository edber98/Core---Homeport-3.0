const { utils } = require("./utils");

module.exports = {
  async aws_ses_send_raw(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.rawMessage) return { ok: false, error: "Message brut requis." };

    const encoded = Buffer.from(d.rawMessage).toString("base64");
    const res = await utils.sesRequest(opts, "SendRawEmail", { "RawMessage.Data": encoded });
    if (!res.ok) return res;
    const messageId = utils.parseXmlTagSingle(res.data, "MessageId") || "";
    return { ok: true, messageId, status: "sent" };
  }
};
