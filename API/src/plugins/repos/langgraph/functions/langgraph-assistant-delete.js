const { utils } = require('./utils');

module.exports = {
  async langgraph_assistant_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/assistants/{assistant_id}";
    const assistant_id = String(d.assistant_id || '').trim();
    if (!assistant_id) return { ok: false, error: 'assistant_id requis.' };
    reqPath = reqPath.replace('{assistant_id}', encodeURIComponent(assistant_id));

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

