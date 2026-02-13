const { utils } = require("./utils");

module.exports = {
  async wp_post_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const postId = (d.postId || "").toString().trim();
    if (!postId) return { ok: false, error: "Missing postId." };

    log('Récupération des données...');
    const res = await utils.wpRequest(opts, `/posts/${encodeURIComponent(postId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), title: r.title?.rendered || "", slug: r.slug, status: r.status, content: r.content?.rendered || "", excerpt: r.excerpt?.rendered || "", author: String(r.author || ""), date: r.date, categories: String(r.categories || []), tags: String(r.tags || []) };
  }
};
