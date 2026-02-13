const { utils } = require("./utils");

module.exports = {
  async docusign_envelope_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.envelopeId || "").trim()) return { ok: false, error: "Missing envelopeId." };

    log('Récupération des données...');
    const res = await utils.docusignRequest(opts, `/envelopes/${d.envelopeId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, envelopeId: r.envelopeId, status: r.status, emailSubject: r.emailSubject, senderName: r.sender?.userName || "", sentDateTime: r.sentDateTime || "", createdDateTime: r.createdDateTime || "" };
  }
};
