const { utils } = require("./utils");

module.exports = {
  async docusign_envelope_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.emailSubject || "").trim()) return { ok: false, error: "Missing emailSubject." };
    if (!(d.signerEmail || "").trim()) return { ok: false, error: "Missing signerEmail." };
    if (!(d.signerName || "").trim()) return { ok: false, error: "Missing signerName." };

    const envelope = {
      emailSubject: d.emailSubject,
      status: d.status || "created",
      recipients: {
        signers: [{
          email: d.signerEmail,
          name: d.signerName,
          recipientId: "1",
          routingOrder: "1"
        }]
      }
    };
    if (d.templateId) envelope.templateId = d.templateId;

    const res = await utils.docusignRequest(opts, "/envelopes", { method: "POST", body: envelope });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, envelopeId: r.envelopeId, status: r.status, emailSubject: d.emailSubject, senderName: "", sentDateTime: r.sentDateTime || "", createdDateTime: r.statusChangedDateTime || "" };
  }
};
