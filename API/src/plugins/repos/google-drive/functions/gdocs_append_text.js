const { utils } = require("./utils");

module.exports = {
  async gdocs_append_text(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.documentId) return { ok: false, error: "Missing documentId." };
    if (!d.text) return { ok: false, error: "Missing text." };
    const doc = await utils.googleRequest(opts, `${utils.DOCS_API}/${d.documentId}`);
    if (!doc.ok) return { ok: false, error: doc.error };
    const endIndex = (doc.data.body?.content || []).reduce((max, el) => Math.max(max, el.endIndex || 0), 1);
    log('Appel API en cours...');
    const res = await utils.googleRequest(opts, `${utils.DOCS_API}/${d.documentId}:batchUpdate`, {
      method: "POST",
      body: { requests: [{ insertText: { location: { index: Math.max(1, endIndex - 1) }, text: d.text } }] }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "appended", message: "Text appended successfully." };
  }
};
