const { utils } = require("./utils");

module.exports = {
  async wp_page_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const title = (d.title || "").trim();
    if (!title) return { ok: false, error: "Missing title." };

    const body = { title, status: d.status || "draft" };
    if (d.content) body.content = d.content;
    if (d.parent) body.parent = parseInt(d.parent, 10) || 0;

    log('Création en cours...');
    const res = await utils.wpRequest(opts, "/pages", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), title: r.title?.rendered || "", slug: r.slug, status: r.status, content: r.content?.rendered || "", author: String(r.author || ""), date: r.date, parent: String(r.parent || "") };
  }
};
