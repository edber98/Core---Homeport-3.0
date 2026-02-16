const { utils } = require("./utils");

module.exports = {
  async gdocs_get_content(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.documentId) return { ok: false, error: "Missing documentId." };
    log('Récupération des données...');
    const res = await utils.googleRequest(opts, `${utils.DOCS_API}/${d.documentId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    let text = "";
    for (const el of (res.data.body?.content || [])) {
      if (el.paragraph) {
        for (const e of (el.paragraph.elements || [])) {
          if (e.textRun) text += e.textRun.content || "";
        }
      }
    }
    return { ok: true, documentId: d.documentId, text };
  }
};
