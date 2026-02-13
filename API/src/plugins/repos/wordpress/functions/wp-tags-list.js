const { utils } = require("./utils");

module.exports = {
  async wp_tags_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.search) query.search = d.search;

    log('Récupération de la liste...');
    const res = await utils.wpRequest(opts, "/tags", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const tags = results.map(r => ({ id: String(r.id), name: r.name || "", slug: r.slug || "", count: String(r.count || 0) }));
    return { ok: true, tags, totalCount: res.totalCount || 0, totalPages: res.totalPages || 0 };
  }
};
