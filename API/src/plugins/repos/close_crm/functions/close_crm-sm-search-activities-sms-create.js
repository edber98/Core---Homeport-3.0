const { utils } = require('./utils');

module.exports = {
  async close_crm_sm_search_activities_sms_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/activity/sms/";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"activity_at","target":"activity_at","type":["null","string"]},{"key":"attachments","target":"attachments","type":["array","null"]},{"key":"contact_id","target":"contact_id","type":["null","string"]},{"key":"created_by","target":"created_by","type":["null","string"]},{"key":"date_created","target":"date_created","type":["null","string"]},{"key":"direction","target":"direction","type":["null","string"]},{"key":"lead_id","target":"lead_id","type":["null","string"]},{"key":"local_phone","target":"local_phone","type":["null","string"]},{"key":"organization_id","target":"organization_id","type":["null","string"]},{"key":"remote_phone","target":"remote_phone","type":["null","string"]},{"key":"source","target":"source","type":["null","string"]},{"key":"status","target":"status","type":"string"},{"key":"template_id","target":"template_id","type":["null","string"]},{"key":"text","target":"text","type":["null","string"]},{"key":"user_id","target":"user_id","type":["null","string"]}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };
  }
};
