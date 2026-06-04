const { utils } = require('./utils');

module.exports = {
  async beehiiv_tier_update_tiers_put(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/publications/{publicationId}/tiers/{tierId}";
    const publicationid = String(d.publicationid || '').trim();
    if (!publicationid) return { ok: false, error: 'publicationid requis.' };
    reqPath = reqPath.replace('{publicationid}', encodeURIComponent(publicationid));
    const tierid = String(d.tierid || '').trim();
    if (!tierid) return { ok: false, error: 'tierid requis.' };
    reqPath = reqPath.replace('{tierid}', encodeURIComponent(tierid));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const builtBody = utils.buildRequestBody(d, [{"key": "name", "bodyKey": "name", "type": "string"}, {"key": "description", "bodyKey": "description", "type": "string"}, {"key": "prices_attributes", "bodyKey": "prices_attributes", "type": "array"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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
