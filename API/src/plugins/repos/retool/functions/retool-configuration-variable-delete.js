const { utils } = require('./utils');

module.exports = {
  async retool_configuration_variable_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/configuration_variables/{variable_id}";
    const variable_id = String(d.variable_id || '').trim();
    if (!variable_id) return { ok: false, error: 'variable_id requis.' };
    reqPath = reqPath.replace('{variable_id}', encodeURIComponent(variable_id));

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
