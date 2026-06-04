const { utils } = require('./utils');

module.exports = {
  async close_crm_call_update_activities_calls_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/activity/call/{id}/";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"activity_at","target":"activity_at","type":["null","string"]},{"key":"contact_id","target":"contact_id","type":["null","string"]},{"key":"conversation_type_id","target":"conversation_type_id","type":["null","string"]},{"key":"custom_fields","target":"custom_fields","type":["null","object"]},{"key":"duration","target":"duration","type":["integer","null"]},{"key":"lead_id","target":"lead_id","type":["null","string"]},{"key":"note","target":"note","type":["null","string"]},{"key":"note_html","target":"note_html","type":["null","string"]},{"key":"outcome_id","target":"outcome_id","type":["null","string"]},{"key":"phone","target":"phone","type":["null","string"]},{"key":"playbook_id","target":"playbook_id","type":["null","string"]},{"key":"quality_info","target":"quality_info","type":["null","string"]},{"key":"recording_url","target":"recording_url","type":["null","string"]},{"key":"status","target":"status","type":["null","string"]},{"key":"user_id","target":"user_id","type":["null","string"]},{"key":"voicemail_url","target":"voicemail_url","type":["null","string"]}]);
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
