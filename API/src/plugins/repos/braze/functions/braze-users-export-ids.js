const { utils } = require('./utils');

module.exports = {
  async braze_users_export_ids(node, msg, inputs, opts) {
    const d = inputs || {};
    const builtBody = utils.buildRequestBody(d, [{"key": "external_ids", "type": "array"}, {"key": "user_aliases", "type": "array"}, {"key": "device_id", "type": "string"}, {"key": "braze_id", "type": "string"}, {"key": "fields_to_export", "type": "array"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body || {};
    const res = await utils.providerRequest(opts, '/users/export/ids', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.job_id || '', name: 'users.export.ids', status: r.message || 'accepted', raw: r };
  }
};
