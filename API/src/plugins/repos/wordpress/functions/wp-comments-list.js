const { utils } = require("./utils");

module.exports = {
  async wp_comments_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.post) query.post = d.post;
    if (d.status) query.status = d.status;

    log('Récupération de la liste...');
    const res = await utils.wpRequest(opts, "/comments", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const comments = results.map(r => ({ id: String(r.id), post: String(r.post || ""), author_name: r.author_name || "", content: r.content?.rendered || "", date: r.date }));
    return { ok: true, comments, totalCount: res.totalCount || 0, totalPages: res.totalPages || 0 };
  }
};
