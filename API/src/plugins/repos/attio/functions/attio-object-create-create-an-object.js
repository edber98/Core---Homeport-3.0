const { utils } = require('./utils');

module.exports = {
  async attio_object_create_create_an_object(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/objects";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.api_slug !== undefined && d.api_slug !== null && d.api_slug !== '') payload.api_slug = d.api_slug;
    if (d.singular_noun !== undefined && d.singular_noun !== null && d.singular_noun !== '') payload.singular_noun = d.singular_noun;
    if (d.plural_noun !== undefined && d.plural_noun !== null && d.plural_noun !== '') payload.plural_noun = d.plural_noun;
    if (payload.api_slug === undefined) return { ok: false, error: 'api_slug requis.' };
    if (payload.singular_noun === undefined) return { ok: false, error: 'singular_noun requis.' };
    if (payload.plural_noun === undefined) return { ok: false, error: 'plural_noun requis.' };
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
