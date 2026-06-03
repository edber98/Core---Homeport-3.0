const { utils } = require("./utils");
module.exports = {
  async docusign_envelope_lock(node, msg, inputs, opts) {
    const d = inputs || {};
    const envelopeId = String(d.envelopeId || "").trim();
    if (!envelopeId) return { ok: false, error: "envelopeId requis." };
    const body = { lockType: "edit", lockDurationInSeconds: Number(d.lockDurationInSeconds || 300) };
    const res = await utils.docusignRequest(opts, `/envelopes/${encodeURIComponent(envelopeId)}/lock`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: "Envelope verrouillée", data: res.data };
  }
};
