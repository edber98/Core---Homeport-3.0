const { utils } = require('./utils');

module.exports = {
  async close_crm_custom_object_type_create_custom_fields_custom_object_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/custom_field/custom_object_type/";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"custom_object_type_id","target":"custom_object_type_id","type":"string"},{"key":"description","target":"description","type":"string"},{"key":"name","target":"name","type":"string"},{"key":"required","target":"required","type":"boolean"},{"key":"type","target":"type","type":"string"}]);
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
