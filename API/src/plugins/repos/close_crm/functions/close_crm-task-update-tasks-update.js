const { utils } = require('./utils');

module.exports = {
  async close_crm_task_update_tasks_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/task/{id}/";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"agent_config_id","target":"agent_config_id","type":"object"},{"key":"assigned_to","target":"assigned_to","type":"string"},{"key":"contact_id","target":"contact_id","type":"object"},{"key":"created_by","target":"created_by","type":"string"},{"key":"date","target":"date","type":"object"},{"key":"due_date","target":"due_date","type":"object"},{"key":"is_complete","target":"is_complete","type":"boolean"},{"key":"is_dateless","target":"is_dateless","type":"boolean"},{"key":"lead_id","target":"lead_id","type":"string"},{"key":"organization_id","target":"organization_id","type":"string"},{"key":"priority","target":"priority","type":"string"},{"key":"resolution","target":"resolution","type":"object"},{"key":"text","target":"text","type":"string"}]);
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
