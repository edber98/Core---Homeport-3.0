const { utils } = require("./utils");

module.exports = {
  async docusign_envelope_void(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.envelopeId || "").trim()) return { ok: false, error: "Missing envelopeId." };
    if (!(d.voidedReason || "").trim()) return { ok: false, error: "Missing voidedReason." };

    log('Appel API en cours...');
    const res = await utils.docusignRequest(opts, `/envelopes/${d.envelopeId}`, { method: "PUT", body: { status: "voided", voidedReason: d.voidedReason } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "voided", message: "Enveloppe annulée." };
  }
};
