const { utils } = require("./utils");

module.exports = {
  async gdocs_replace_text(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.documentId || !d.search || !d.replacement) return { ok: false, error: "Missing documentId, search, or replacement." };
    log('Appel API en cours...');
    const res = await utils.googleRequest(opts, `${utils.DOCS_API}/${d.documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [{ replaceAllText: { containsText: { text: d.search, matchCase: true }, replaceText: d.replacement } }] }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "replaced", message: `Replaced '${d.search}' with '${d.replacement}'.` };
  }
};
