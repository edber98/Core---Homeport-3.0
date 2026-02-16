const { utils } = require("./utils");

module.exports = {
  async docusign_signing_url_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.envelopeId || "").trim()) return { ok: false, error: "Missing envelopeId." };
    if (!(d.recipientEmail || "").trim()) return { ok: false, error: "Missing recipientEmail." };
    if (!(d.recipientName || "").trim()) return { ok: false, error: "Missing recipientName." };
    if (!(d.clientUserId || "").trim()) return { ok: false, error: "Missing clientUserId." };
    if (!(d.returnUrl || "").trim()) return { ok: false, error: "Missing returnUrl." };

    const body = {
      returnUrl: d.returnUrl,
      authenticationMethod: "none",
      email: d.recipientEmail,
      userName: d.recipientName,
      clientUserId: d.clientUserId
    };
    log('Création en cours...');
    const res = await utils.docusignRequest(opts, `/envelopes/${d.envelopeId}/views/recipient`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, url: res.data?.url || "" };
  }
};
