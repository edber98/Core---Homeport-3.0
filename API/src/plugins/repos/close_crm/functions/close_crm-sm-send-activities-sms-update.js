const { utils } = require('./utils');

module.exports = {
  async close_crm_sm_send_activities_sms_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/activity/sms/{id}/";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"activity_at","target":"activity_at","type":["null","string"]},{"key":"attachments","target":"attachments","type":["array","null"]},{"key":"contact_id","target":"contact_id","type":["null","string"]},{"key":"lead_id","target":"lead_id","type":["null","string"]},{"key":"local_phone","target":"local_phone","type":["null","string"]},{"key":"remote_phone","target":"remote_phone","type":["null","string"]},{"key":"status","target":"status","type":"string"},{"key":"template_id","target":"template_id","type":["null","string"]},{"key":"text","target":"text","type":["null","string"]},{"key":"user_id","target":"user_id","type":["null","string"]}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
