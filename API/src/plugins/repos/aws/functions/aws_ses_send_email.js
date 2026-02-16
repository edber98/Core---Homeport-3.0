const { utils } = require("./utils");

module.exports = {
  async aws_ses_send_email(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.from) return { ok: false, error: "Expéditeur requis." };
    if (!d.to) return { ok: false, error: "Destinataire requis." };
    if (!d.subject) return { ok: false, error: "Sujet requis." };

    const params = {
      "Source": d.from,
      "Message.Subject.Data": d.subject,
      "Message.Subject.Charset": "UTF-8"
    };

    const toList = d.to.split(",").map(s => s.trim());
    toList.forEach((t, i) => { params[`Destination.ToAddresses.member.${i + 1}`] = t; });

    if (d.cc) {
      d.cc.split(",").map(s => s.trim()).forEach((c, i) => { params[`Destination.CcAddresses.member.${i + 1}`] = c; });
    }
    if (d.bcc) {
      d.bcc.split(",").map(s => s.trim()).forEach((b, i) => { params[`Destination.BccAddresses.member.${i + 1}`] = b; });
    }

    if (d.htmlBody) {
      params["Message.Body.Html.Data"] = d.htmlBody;
      params["Message.Body.Html.Charset"] = "UTF-8";
    }
    if (d.textBody) {
      params["Message.Body.Text.Data"] = d.textBody;
      params["Message.Body.Text.Charset"] = "UTF-8";
    }

    log('Création en cours...');
    const res = await utils.sesRequest(opts, "SendEmail", params);
    if (!res.ok) return res;
    const messageId = utils.parseXmlTagSingle(res.data, "MessageId") || "";
    return { ok: true, messageId, status: "sent" };
  }
};
