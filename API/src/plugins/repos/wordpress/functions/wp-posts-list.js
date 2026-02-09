const { utils } = require("./utils");

module.exports = {
  async wp_posts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;
    if (d.status) query.status = d.status;
    if (d.search) query.search = d.search;

    const res = await utils.wpRequest(opts, "/posts", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const posts = results.map(r => ({ id: String(r.id), title: r.title?.rendered || "", slug: r.slug, status: r.status, author: String(r.author || ""), date: r.date }));
    return { ok: true, posts };
  }
};
