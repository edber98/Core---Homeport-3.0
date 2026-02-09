const { utils } = require("./utils");

module.exports = {
  async docusign_envelope_send(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.envelopeId || "").trim()) return { ok: false, error: "Missing envelopeId." };

    const res = await utils.docusignRequest(opts, `/envelopes/${d.envelopeId}`, { method: "PUT", body: { status: "sent" } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, envelopeId: r.envelopeId || d.envelopeId, status: "sent", emailSubject: r.emailSubject || "", senderName: "", sentDateTime: r.sentDateTime || "", createdDateTime: r.createdDateTime || "" };
  }
};
