const { utils } = require("./utils");
module.exports = {
  async docusign_envelope_audit_events_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const envelopeId = String(d.envelopeId || "").trim();
    if (!envelopeId) return { ok: false, error: "envelopeId requis." };
    const res = await utils.docusignRequest(opts, `/envelopes/${encodeURIComponent(envelopeId)}/audit_events`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: "Audit events récupérés", data: res.data };
  }
};
