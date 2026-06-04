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

