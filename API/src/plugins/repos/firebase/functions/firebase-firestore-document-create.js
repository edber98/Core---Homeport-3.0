const { utils } = require("./utils");

module.exports = {
  async firebase_firestore_document_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};
    const collectionPath = String(d.collectionPath || "").trim();
    if (!collectionPath) return { ok: false, error: "Chemin de collection requis." };

    let data;
    try { data = utils.parseJsonInput(d.fields, "Champs"); } catch (e) { return { ok: false, error: e.message }; }
    if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "Les champs doivent être un objet JSON." };

    let url;
    try { url = utils.firestoreCollectionUrl(credentials, collectionPath, d.databaseId); } catch (e) { return { ok: false, error: e.message }; }

    log("Création du document Firestore...");
    const res = await utils.firebaseRequest(opts, url, {
      method: "POST",
      query: { documentId: d.documentId },
      body: { fields: utils.jsonToFirestoreFields(data) }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactDocument(res.data || {}) };
  }
};
