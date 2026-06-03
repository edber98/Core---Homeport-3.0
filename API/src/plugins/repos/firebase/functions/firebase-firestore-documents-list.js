const { utils } = require("./utils");

module.exports = {
  async firebase_firestore_documents_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};
    const collectionPath = String(d.collectionPath || "").trim();
    if (!collectionPath) return { ok: false, error: "Chemin de collection requis." };

    let url;
    try { url = utils.firestoreCollectionUrl(credentials, collectionPath, d.databaseId); } catch (e) { return { ok: false, error: e.message }; }
    log("Lecture des documents Firestore...");
    const res = await utils.firebaseRequest(opts, url, {
      query: { pageSize: utils.toInt(d.pageSize, 50), pageToken: d.pageToken, orderBy: d.orderBy }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const documents = (res.data?.documents || []).map(utils.compactDocument);
    return { ok: true, documents, totalCount: documents.length, nextPageToken: res.data?.nextPageToken || "" };
  }
};
