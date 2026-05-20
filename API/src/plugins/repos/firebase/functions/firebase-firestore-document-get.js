const { utils } = require("./utils");

module.exports = {
  async firebase_firestore_document_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};
    const documentPath = String(d.documentPath || "").trim();
    if (!documentPath) return { ok: false, error: "Chemin du document requis." };

    let url;
    try { url = utils.firestoreDocumentUrl(credentials, documentPath, d.databaseId); } catch (e) { return { ok: false, error: e.message }; }
    const res = await utils.firebaseRequest(opts, url);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactDocument(res.data || {}) };
  }
};
