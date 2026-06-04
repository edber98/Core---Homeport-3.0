const { utils } = require('./utils');

module.exports = {
  async browserbase_generic_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const path = String(d.path || '').trim();
    if (!path) return { ok: false, error: 'path requis.' };

    const method = String(d.method || 'GET').toUpperCase();
    const builtBody = utils.buildBodyFromFields(d.requestFields);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body;

    const res = await utils.browserbaseRequest(opts, path, { method, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const item = utils.itemFromUnknown(res.data || {});
    return { ok: true, ...item };
  }
};
