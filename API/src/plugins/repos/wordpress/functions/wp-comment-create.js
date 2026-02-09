const { utils } = require("./utils");

module.exports = {
  async wp_comment_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const post = (d.post || "").toString().trim();
    const content = (d.content || "").trim();
    if (!post) return { ok: false, error: "Missing post." };
    if (!content) return { ok: false, error: "Missing content." };

    const body = { post: parseInt(post, 10), content };
    if (d.author_name) body.author_name = d.author_name;
    if (d.author_email) body.author_email = d.author_email;

    const res = await utils.wpRequest(opts, "/comments", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), post: String(r.post || ""), author_name: r.author_name || "", author_email: r.author_email || "", content: r.content?.rendered || "", status: r.status || "", date: r.date };
  }
};
