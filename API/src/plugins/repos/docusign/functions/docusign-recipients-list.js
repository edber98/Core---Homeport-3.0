const { utils } = require("./utils");

module.exports = {
  async docusign_recipients_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.envelopeId || "").trim()) return { ok: false, error: "Missing envelopeId." };

    log('Récupération de la liste...');
    const res = await utils.docusignRequest(opts, `/envelopes/${d.envelopeId}/recipients`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const signers = (res.data && res.data.signers) || [];
    const recipients = signers.map(r => ({ recipientId: r.recipientId, name: r.name, email: r.email, status: r.status, routingOrder: r.routingOrder }));
    return { ok: true, recipients , totalCount: recipients.length };
  }
};
