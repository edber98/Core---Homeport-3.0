const { utils } = require('./utils');

module.exports = {
  async close_crm_task_create_tasks_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/task/";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"_type","target":"_type","type":"string"},{"key":"assigned_to","target":"assigned_to","type":"object"},{"key":"contact_id","target":"contact_id","type":"string"},{"key":"created_by","target":"created_by","type":"string"},{"key":"date","target":"date","type":"object"},{"key":"date_created","target":"date_created","type":"object"},{"key":"disable_notification","target":"disable_notification","type":"boolean"},{"key":"due_date","target":"due_date","type":"object"},{"key":"is_complete","target":"is_complete","type":"boolean"},{"key":"is_dateless","target":"is_dateless","type":"boolean"},{"key":"lead_id","target":"lead_id","type":"string"},{"key":"organization_id","target":"organization_id","type":"string"},{"key":"priority","target":"priority","type":"string"},{"key":"text","target":"text","type":"object"},{"key":"agent_config_id","target":"agent_config_id","type":"object"}]);
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
