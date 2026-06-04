const { utils } = require('./utils');

module.exports = {
  async braze_canvas_trigger_send(node, msg, inputs, opts) {
    const d = inputs || {};
    const builtBody = utils.buildRequestBody(d, [{"key": "canvas_id", "type": "string"}, {"key": "send_id", "type": "string"}, {"key": "trigger_properties", "type": "object"}, {"key": "broadcast", "type": "boolean"}, {"key": "audience", "type": "object"}, {"key": "recipients", "type": "array"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body || {};
    const res = await utils.providerRequest(opts, '/canvas/trigger/send', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.dispatch_id || '', name: 'canvas.trigger.send', status: r.message || 'queued', raw: r };
  }
};
