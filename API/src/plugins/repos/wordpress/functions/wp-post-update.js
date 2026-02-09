const { utils } = require("./utils");

module.exports = {
  async wp_post_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const postId = (d.postId || "").toString().trim();
    if (!postId) return { ok: false, error: "Missing postId." };

    const body = {};
    if (d.title) body.title = d.title;
    if (d.content) body.content = d.content;
    if (d.status) body.status = d.status;
    if (d.excerpt) body.excerpt = d.excerpt;

    const res = await utils.wpRequest(opts, `/posts/${encodeURIComponent(postId)}`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), title: r.title?.rendered || "", slug: r.slug, status: r.status, content: r.content?.rendered || "", excerpt: r.excerpt?.rendered || "", author: String(r.author || ""), date: r.date, categories: String(r.categories || []), tags: String(r.tags || []) };
  }
};
