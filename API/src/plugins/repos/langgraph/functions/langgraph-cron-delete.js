const { utils } = require('./utils');

module.exports = {
  async langgraph_cron_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/crons/{cron_id}";
    const cron_id = String(d.cron_id || '').trim();
    if (!cron_id) return { ok: false, error: 'cron_id requis.' };
    reqPath = reqPath.replace('{cron_id}', encodeURIComponent(cron_id));

    const query = {};

    const headers = {};

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

