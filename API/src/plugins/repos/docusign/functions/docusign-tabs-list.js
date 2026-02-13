const { utils } = require("./utils");

module.exports = {
  async docusign_tabs_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.envelopeId || "").trim()) return { ok: false, error: "Missing envelopeId." };
    if (!(d.recipientId || "").trim()) return { ok: false, error: "Missing recipientId." };

    log('Récupération de la liste...');
    const res = await utils.docusignRequest(opts, `/envelopes/${d.envelopeId}/recipients/${d.recipientId}/tabs`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: JSON.stringify(res.data) };
  }
};
