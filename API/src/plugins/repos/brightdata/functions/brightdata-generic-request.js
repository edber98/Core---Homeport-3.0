const { utils } = require('./utils');

module.exports = {
  async brightdata_generic_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const path = String(d.path || '').trim();
    if (!path) return { ok: false, error: 'Path requis.' };

    const method = String(d.method || 'GET').toUpperCase();
    const builtBody = utils.buildBodyFromFields(d.requestFields);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body;

    const res = await utils.providerRequest(opts, path, { method, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, status: r.status || 'success', result_json: JSON.stringify(r) };
  }
};
