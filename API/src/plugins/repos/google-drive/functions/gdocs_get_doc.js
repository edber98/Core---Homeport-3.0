const { utils } = require("./utils");

module.exports = {
  async gdocs_get_doc(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.documentId) return { ok: false, error: "Missing documentId." };
    log('Récupération des données...');
    const res = await utils.googleRequest(opts, `${utils.DOCS_API}/${d.documentId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, documentId: res.data.documentId, title: res.data.title, revisionId: res.data.revisionId || "" };
  }
};
