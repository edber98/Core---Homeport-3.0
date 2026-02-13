const { utils } = require("./utils");

module.exports = {
  async typeform_forms_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.pageSize) query.page_size = d.pageSize;
    if (d.page) query.page = d.page;
    if (d.search) query.search = d.search;
    if (d.workspaceId) query.workspace_id = d.workspaceId;

    log('Récupération de la liste...');
    const res = await utils.typeformRequest(opts, "/forms", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.items) || [];
    const forms = items.map(r => ({ id: r.id, title: r.title, type: r.type || "", status: r.settings?.is_public ? "public" : "private", link: r._links?.display || "", createdAt: r.created_at || "" }));
    return { ok: true, forms, totalCount: res.data?.total_items || forms.length, totalPages: res.data?.page_count || 0 };
  }
};
