const { utils } = require("./utils");

module.exports = {
  async firebase_firestore_query_run(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};

    const parentPath = String(d.parentPath || "").trim();
    let structuredQuery;
    try {
      structuredQuery = utils.parseJsonInput(d.structuredQuery, "Structured Query");
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!structuredQuery || typeof structuredQuery !== "object" || Array.isArray(structuredQuery)) {
      return { ok: false, error: "Le champ Structured Query doit être un objet JSON." };
    }

    let parentUrl;
    try {
      parentUrl = utils.firestoreCollectionUrl(credentials, parentPath, d.databaseId);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    const url = `${parentUrl}:runQuery`;

    log("Exécution de la requête Firestore...");
    const res = await utils.firebaseRequest(opts, url, {
      method: "POST",
      body: { structuredQuery }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const rows = Array.isArray(res.data) ? res.data : [];
    const documents = rows
      .map((row) => (row && row.document ? utils.compactDocument(row.document) : null))
      .filter(Boolean);

    return {
      ok: true,
      totalCount: documents.length,
      nextPageToken: "",
      documents
    };
  }
};
