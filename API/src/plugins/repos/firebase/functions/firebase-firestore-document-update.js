const { utils } = require("./utils");

module.exports = {
  async firebase_firestore_document_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};
    const documentPath = String(d.documentPath || "").trim();
    if (!documentPath) return { ok: false, error: "Chemin du document requis." };

    let data;
    try { data = utils.parseJsonInput(d.fields, "Champs"); } catch (e) { return { ok: false, error: e.message }; }
    if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "Les champs doivent être un objet JSON." };

    let url;
    try { url = utils.firestoreDocumentUrl(credentials, documentPath, d.databaseId); } catch (e) { return { ok: false, error: e.message }; }

    log("Mise à jour du document Firestore...");
    const res = await utils.firebaseRequest(opts, url, {
      method: "PATCH",
      query: { "updateMask.fieldPaths": utils.splitLines(d.updateMask) },
      body: { fields: utils.jsonToFirestoreFields(data) }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactDocument(res.data || {}) };
  }
};
