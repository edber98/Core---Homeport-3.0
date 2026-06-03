const { utils } = require('./utils');

module.exports = {
  async retool_resource_configuration_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/resource_configurations/{configuration_id}";
    const configuration_id = String(d.configuration_id || '').trim();
    if (!configuration_id) return { ok: false, error: 'configuration_id requis.' };
    reqPath = reqPath.replace('{configuration_id}', encodeURIComponent(configuration_id));

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
