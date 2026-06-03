const { utils } = require('./utils');

module.exports = {
  async retool_resource_configuration_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/resource_configurations/{configuration_id}";
    const configuration_id = String(d.configuration_id || '').trim();
    if (!configuration_id) return { ok: false, error: 'configuration_id requis.' };
    reqPath = reqPath.replace('{configuration_id}', encodeURIComponent(configuration_id));

    const query = {};
    

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      ...(r && typeof r === 'object' ? r : { value: r }),
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
