const { utils } = require('./utils');

module.exports = {
  async attio_task_delete_delete_a_task(node, msg, inputs, opts) {
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

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
