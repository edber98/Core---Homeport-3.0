const { utils } = require("./utils");

module.exports = {
  async wp_media_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;
    if (d.media_type) query.media_type = d.media_type;

    const res = await utils.wpRequest(opts, "/media", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const medias = results.map(r => ({ id: String(r.id), title: r.title?.rendered || "", source_url: r.source_url || "", media_type: r.media_type || "", date: r.date }));
    return { ok: true, medias, totalCount: res.totalCount || 0, totalPages: res.totalPages || 0 };
  }
};
