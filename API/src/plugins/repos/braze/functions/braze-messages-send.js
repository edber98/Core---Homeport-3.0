const { utils } = require('./utils');

module.exports = {
  async braze_messages_send(node, msg, inputs, opts) {
    const d = inputs || {};
    const builtBody = utils.buildRequestBody(d, [{"key": "broadcast", "type": "boolean"}, {"key": "external_user_ids", "type": "array"}, {"key": "user_aliases", "type": "array"}, {"key": "segment_id", "type": "string"}, {"key": "audience", "type": "object"}, {"key": "campaign_id", "type": "string"}, {"key": "messages", "type": "object"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body || {};
    const res = await utils.providerRequest(opts, '/messages/send', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.dispatch_id || '', name: 'messages.send', status: r.message || 'queued', raw: r };
  }
};
