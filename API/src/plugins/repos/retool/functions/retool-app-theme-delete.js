const { utils } = require('./utils');

module.exports = {
  async retool_app_theme_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/app_themes/{theme_id}";
    const theme_id = String(d.theme_id || '').trim();
    if (!theme_id) return { ok: false, error: 'theme_id requis.' };
    reqPath = reqPath.replace('{theme_id}', encodeURIComponent(theme_id));

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
