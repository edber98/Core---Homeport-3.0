const { utils } = require('./utils');

module.exports = {
  async braze_users_track(node, msg, inputs, opts) {
    const d = inputs || {};
    const builtBody = utils.buildRequestBody(d, [{"key": "userAttributes", "bodyKey": "attributes", "type": "array"}, {"key": "events", "type": "array"}, {"key": "purchases", "type": "array"}, {"key": "partner", "type": "string"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body || {};
    const res = await utils.providerRequest(opts, '/users/track', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.dispatch_id || '', name: 'users.track', status: r.message || 'success', raw: r };
  }
};
