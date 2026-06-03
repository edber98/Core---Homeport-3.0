const { utils } = require('./utils');

module.exports = {
  async smartlead_lead_tag_api_reference_lead_tags_remove_from_lead(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v1/crm/leads/tags/{tagMappingId}";
    const tagmappingid = String(d.tagmappingid || '').trim();
    if (!tagmappingid) return { ok: false, error: 'tagmappingid requis.' };
    reqPath = reqPath.replace('{tagmappingid}', encodeURIComponent(tagmappingid));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
