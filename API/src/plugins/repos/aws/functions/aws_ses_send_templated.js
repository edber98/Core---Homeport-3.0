const { utils } = require("./utils");

module.exports = {
  async aws_ses_send_templated(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.from || !d.to || !d.templateName) return { ok: false, error: "Expéditeur, destinataire et template requis." };

    const toList = d.to.split(",").map(s => s.trim());
    const params = {
      "Source": d.from,
      "Template": d.templateName,
      "TemplateData": d.templateData || "{}"
    };
    toList.forEach((t, i) => { params[`Destination.ToAddresses.member.${i + 1}`] = t; });

    const res = await utils.sesRequest(opts, "SendTemplatedEmail", params);
    if (!res.ok) return res;
    const messageId = utils.parseXmlTagSingle(res.data, "MessageId") || "";
    return { ok: true, messageId, status: "sent" };
  }
};
