const { utils } = require('./utils');

module.exports = {
  async attio_task_update_update_a_task(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/tasks/{task_id}";
    const task_id = String(d.task_id || '').trim();
    if (!task_id) return { ok: false, error: 'task_id requis.' };
    reqPath = reqPath.replace('{task_id}', encodeURIComponent(task_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.deadline_at !== undefined && d.deadline_at !== null && d.deadline_at !== '') payload.deadline_at = d.deadline_at;
    if (d.is_completed !== undefined && d.is_completed !== null && d.is_completed !== '') payload.is_completed = Boolean(d.is_completed);
    if (d.linked_records !== undefined && d.linked_records !== null && d.linked_records !== '') {
      try { payload.linked_records = utils.parseJsonInput(d.linked_records, 'linked_records', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.assignees !== undefined && d.assignees !== null && d.assignees !== '') {
      try { payload.assignees = utils.parseJsonInput(d.assignees, 'assignees', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (!Object.keys(payload).length) return { ok: false, error: 'Aucun champ à envoyer.' };
    const body = { data: payload };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
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
