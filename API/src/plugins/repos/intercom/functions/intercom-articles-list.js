const { utils } = require("./utils");

module.exports = {
  async intercom_articles_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.perPage) query.per_page = d.perPage;
    if (d.page) query.page = d.page;

    const res = await utils.intercomRequest(opts, "/articles", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.data) || [];
    const articles = items.map(r => ({ id: r.id, title: r.title || "", state: r.state || "", url: r.url || "", createdAt: String(r.created_at || "") }));
    return { ok: true, articles };
  }
};
