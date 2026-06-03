const { utils } = require("./utils");
module.exports = {
  async docusign_envelope_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const envelopeId = String(d.envelopeId || "").trim();
    if (!envelopeId) return { ok: false, error: "envelopeId requis." };
    const body = {};
    if (d.status) body.status = String(d.status);
    if (d.emailSubject) body.emailSubject = String(d.emailSubject);
    if (d.emailBlurb) body.emailBlurb = String(d.emailBlurb);
    const res = await utils.docusignRequest(opts, `/envelopes/${encodeURIComponent(envelopeId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: "Envelope mise à jour", data: res.data };
  }
};
