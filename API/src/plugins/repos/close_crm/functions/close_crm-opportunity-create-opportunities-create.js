const { utils } = require('./utils');

module.exports = {
  async close_crm_opportunity_create_opportunities_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/opportunity/";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"attachments","target":"attachments","type":"object"},{"key":"confidence","target":"confidence","type":"object"},{"key":"contact_id","target":"contact_id","type":"object"},{"key":"created_by","target":"created_by","type":"object"},{"key":"custom_fields","target":"custom_fields","type":"object"},{"key":"date_created","target":"date_created","type":"object"},{"key":"date_won","target":"date_won","type":"object"},{"key":"lead_id","target":"lead_id","type":"object"},{"key":"note","target":"note","type":"object"},{"key":"pipeline_id","target":"pipeline_id","type":"object"},{"key":"status_id","target":"status_id","type":"object"},{"key":"user_id","target":"user_id","type":"object"},{"key":"value","target":"value","type":"object"},{"key":"value_period","target":"value_period","type":"object"},{"key":"customFields","target":"__customFields","type":"customFields"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

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
