const { utils } = require('./utils');

module.exports = {
  async retool_environment_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/environments/{environment_id}";
    const environment_id = String(d.environment_id || '').trim();
    if (!environment_id) return { ok: false, error: 'environment_id requis.' };
    reqPath = reqPath.replace('{environment_id}', encodeURIComponent(environment_id));

    const query = {};
    

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
