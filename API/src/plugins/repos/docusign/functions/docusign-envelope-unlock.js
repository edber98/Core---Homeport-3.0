const { utils } = require("./utils");
module.exports = {
  async docusign_envelope_unlock(node, msg, inputs, opts) {
    const d = inputs || {};
    const envelopeId = String(d.envelopeId || "").trim();
    if (!envelopeId) return { ok: false, error: "envelopeId requis." };
    const res = await utils.docusignRequest(opts, `/envelopes/${encodeURIComponent(envelopeId)}/lock`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: "Envelope déverrouillée", data: res.data };
  }
};
