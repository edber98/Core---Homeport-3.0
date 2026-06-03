const { utils } = require('./utils');

module.exports = {
  async retool_app_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/apps/{app_id}";
    const app_id = String(d.app_id || '').trim();
    if (!app_id) return { ok: false, error: 'app_id requis.' };
    reqPath = reqPath.replace('{app_id}', encodeURIComponent(app_id));

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
