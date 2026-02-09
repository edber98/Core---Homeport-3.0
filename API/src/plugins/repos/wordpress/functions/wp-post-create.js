const { utils } = require("./utils");

module.exports = {
  async wp_post_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const title = (d.title || "").trim();
    if (!title) return { ok: false, error: "Missing title." };

    const body = { title, status: d.status || "draft" };
    if (d.content) body.content = d.content;
    if (d.excerpt) body.excerpt = d.excerpt;
    if (d.categories) body.categories = String(d.categories).split(",").map(s => parseInt(s.trim(),10)).filter(Boolean);
    if (d.tags) body.tags = String(d.tags).split(",").map(s => parseInt(s.trim(),10)).filter(Boolean);

    const res = await utils.wpRequest(opts, "/posts", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), title: r.title?.rendered || "", slug: r.slug, status: r.status, content: r.content?.rendered || "", excerpt: r.excerpt?.rendered || "", author: String(r.author || ""), date: r.date, categories: String(r.categories || []), tags: String(r.tags || []) };
  }
};
