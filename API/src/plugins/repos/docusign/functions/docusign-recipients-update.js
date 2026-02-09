const { utils } = require("./utils");

module.exports = {
  async docusign_recipients_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.envelopeId || "").trim()) return { ok: false, error: "Missing envelopeId." };
    if (!(d.recipientId || "").trim()) return { ok: false, error: "Missing recipientId." };

    const signer = { recipientId: d.recipientId };
    if (d.signerEmail) signer.email = d.signerEmail;
    if (d.signerName) signer.name = d.signerName;

    const res = await utils.docusignRequest(opts, `/envelopes/${d.envelopeId}/recipients`, { method: "PUT", body: { signers: [signer] } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "updated", message: "Destinataires mis à jour." };
  }
};
