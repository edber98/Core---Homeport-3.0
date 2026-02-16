const { utils } = require("./utils");

module.exports = {
  async typeform_themes_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.pageSize) query.page_size = d.pageSize;
    if (d.page) query.page = d.page;

    log('Récupération de la liste...');
    const res = await utils.typeformRequest(opts, "/themes", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.items) || [];
    const themes = items.map(r => ({ id: r.id, name: r.name, font: r.font || "" }));
    return { ok: true, themes, totalCount: res.data?.total_items || themes.length, totalPages: res.data?.page_count || 0 };
  }
};
