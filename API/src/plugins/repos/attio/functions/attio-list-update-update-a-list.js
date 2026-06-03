const { utils } = require('./utils');

module.exports = {
  async attio_list_update_update_a_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/lists/{list}";
    const list = String(d.list || '').trim();
    if (!list) return { ok: false, error: 'list requis.' };
    reqPath = reqPath.replace('{list}', encodeURIComponent(list));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') payload.name = d.name;
    if (d.api_slug !== undefined && d.api_slug !== null && d.api_slug !== '') payload.api_slug = d.api_slug;
    if (d.workspace_access !== undefined && d.workspace_access !== null && d.workspace_access !== '') payload.workspace_access = d.workspace_access;
    if (d.workspace_member_access !== undefined && d.workspace_member_access !== null && d.workspace_member_access !== '') {
      try { payload.workspace_member_access = utils.parseJsonInput(d.workspace_member_access, 'workspace_member_access', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (!Object.keys(payload).length) return { ok: false, error: 'Aucun champ à envoyer.' };
    const body = { data: payload };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
