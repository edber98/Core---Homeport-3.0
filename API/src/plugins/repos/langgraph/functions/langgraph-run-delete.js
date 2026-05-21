const { utils } = require('./utils');

module.exports = {
  async langgraph_run_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/threads/{thread_id}/runs/{run_id}";
    const thread_id = String(d.thread_id || '').trim();
    if (!thread_id) return { ok: false, error: 'thread_id requis.' };
    reqPath = reqPath.replace('{thread_id}', encodeURIComponent(thread_id));
    const run_id = String(d.run_id || '').trim();
    if (!run_id) return { ok: false, error: 'run_id requis.' };
    reqPath = reqPath.replace('{run_id}', encodeURIComponent(run_id));

    let query = {};
    try { query = utils.parseJsonInput(d.query, 'query', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body, headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
