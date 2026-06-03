const { utils } = require('./utils');

module.exports = {
  async retool_resource_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/resources/{resource_id}";
    const resource_id = String(d.resource_id || '').trim();
    if (!resource_id) return { ok: false, error: 'resource_id requis.' };
    reqPath = reqPath.replace('{resource_id}', encodeURIComponent(resource_id));

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
