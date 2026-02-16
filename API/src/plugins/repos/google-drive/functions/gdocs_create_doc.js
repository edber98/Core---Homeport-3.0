const { utils } = require("./utils");

module.exports = {
  async gdocs_create_doc(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.title) return { ok: false, error: "Missing title." };
    log('Création en cours...');
    const res = await utils.googleRequest(opts, utils.DOCS_API, { method: "POST", body: { title: d.title } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    if (d.content) {
      await utils.googleRequest(opts, `${utils.DOCS_API}/${res.data.documentId}:batchUpdate`, {
        method: "POST",
        body: { requests: [{ insertText: { location: { index: 1 }, text: d.content } }] }
      });
    }
    return { ok: true, documentId: res.data.documentId, title: res.data.title, revisionId: res.data.revisionId || "" };
  }
};
