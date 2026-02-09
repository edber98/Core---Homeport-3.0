const { utils } = require("./utils");

module.exports = {
  async intercom_article_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.articleId || "").trim()) return { ok: false, error: "Missing articleId." };

    const res = await utils.intercomRequest(opts, `/articles/${d.articleId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, title: r.title || "", description: r.description || "", state: r.state || "", url: r.url || "", createdAt: String(r.created_at || "") };
  }
};
