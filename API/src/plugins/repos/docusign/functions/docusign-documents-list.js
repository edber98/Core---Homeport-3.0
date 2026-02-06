const { utils } = require("./utils");

module.exports = {
  async docusign_documents_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.envelopeId || "").trim()) return { ok: false, error: "Missing envelopeId." };

    const res = await utils.docusignRequest(opts, `/envelopes/${d.envelopeId}/documents`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.envelopeDocuments) || [];
    const documents = items.map(r => ({ documentId: r.documentId, name: r.name, type: r.type || "", order: r.order || "" }));
    return { ok: true, documents };
  }
};
