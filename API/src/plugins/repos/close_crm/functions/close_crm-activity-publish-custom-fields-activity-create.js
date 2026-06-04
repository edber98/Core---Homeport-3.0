const { utils } = require('./utils');

module.exports = {
  async close_crm_activity_publish_custom_fields_activity_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/custom_field/activity/";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"accepts_multiple_values","target":"accepts_multiple_values","type":"boolean"},{"key":"custom_activity_type_id","target":"custom_activity_type_id","type":"string"},{"key":"editable_with_roles","target":"editable_with_roles","type":"array"},{"key":"name","target":"name","type":"string"},{"key":"required","target":"required","type":"boolean"},{"key":"type","target":"type","type":"string"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
