const { utils } = require('./utils');

module.exports = {
  async langgraph_cron_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/crons/{cron_id}";
    const cron_id = String(d.cron_id || '').trim();
    if (!cron_id) return { ok: false, error: 'cron_id requis.' };
    reqPath = reqPath.replace('{cron_id}', encodeURIComponent(cron_id));

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
