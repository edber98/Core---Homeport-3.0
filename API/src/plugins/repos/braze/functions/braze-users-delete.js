const { utils } = require('./utils');

module.exports = {
  async braze_users_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const builtBody = utils.buildRequestBody(d, [{"key": "external_ids", "type": "array"}, {"key": "user_aliases", "type": "array"}, {"key": "braze_ids", "type": "array"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body || {};
    const res = await utils.providerRequest(opts, '/users/delete', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: '', name: 'users.delete', status: r.message || 'deleted', raw: r };
  }
};
