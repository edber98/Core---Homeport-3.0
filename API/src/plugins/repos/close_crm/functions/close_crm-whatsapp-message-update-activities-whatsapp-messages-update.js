const { utils } = require('./utils');

module.exports = {
  async close_crm_whatsapp_message_update_activities_whatsapp_messages_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/activity/whatsapp_message/{id}/";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"activity_at","target":"activity_at","type":"string"},{"key":"attachments","target":"attachments","type":"array"},{"key":"contact_id","target":"contact_id","type":"string"},{"key":"direction","target":"direction","type":"string"},{"key":"integration_link","target":"integration_link","type":"object"},{"key":"local_phone","target":"local_phone","type":"string"},{"key":"message_markdown","target":"message_markdown","type":"string"},{"key":"remote_phone","target":"remote_phone","type":"string"},{"key":"response_to_id","target":"response_to_id","type":"object"},{"key":"user_id","target":"user_id","type":"string"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

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
