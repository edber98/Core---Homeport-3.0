const { utils } = require("./utils");

module.exports = {
  async docusign_envelope_documents_download(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.envelopeId || "").trim()) return { ok: false, error: "Missing envelopeId." };
    const docId = d.documentId || "combined";

    log('Récupération des données...');
    const res = await utils.docusignRequest(opts, `/envelopes/${d.envelopeId}/documents/${docId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "downloaded", message: typeof res.data === "string" ? res.data.substring(0, 200) + "..." : "Document téléchargé." };
  }
};
