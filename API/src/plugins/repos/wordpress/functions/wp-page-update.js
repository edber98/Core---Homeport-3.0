const { utils } = require("./utils");

module.exports = {
  async wp_page_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").toString().trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };

    const body = {};
    if (d.title) body.title = d.title;
    if (d.content) body.content = d.content;
    if (d.status) body.status = d.status;

    log('Mise à jour en cours...');
    const res = await utils.wpRequest(opts, `/pages/${encodeURIComponent(pageId)}`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), title: r.title?.rendered || "", slug: r.slug, status: r.status, content: r.content?.rendered || "", author: String(r.author || ""), date: r.date, parent: String(r.parent || "") };
  }
};
