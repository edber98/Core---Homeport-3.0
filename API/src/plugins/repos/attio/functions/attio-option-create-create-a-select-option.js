const { utils } = require('./utils');

module.exports = {
  async attio_option_create_create_a_select_option(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/{target}/{identifier}/attributes/{attribute}/options";
    const target = String(d.target || '').trim();
    if (!target) return { ok: false, error: 'target requis.' };
    reqPath = reqPath.replace('{target}', encodeURIComponent(target));
    const identifier = String(d.identifier || '').trim();
    if (!identifier) return { ok: false, error: 'identifier requis.' };
    reqPath = reqPath.replace('{identifier}', encodeURIComponent(identifier));
    const attribute = String(d.attribute || '').trim();
    if (!attribute) return { ok: false, error: 'attribute requis.' };
    reqPath = reqPath.replace('{attribute}', encodeURIComponent(attribute));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.title !== undefined && d.title !== null && d.title !== '') payload.title = d.title;
    if (payload.title === undefined) return { ok: false, error: 'title requis.' };
    const body = { data: payload };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
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
