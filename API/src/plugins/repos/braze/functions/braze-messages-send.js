const { utils } = require('./utils');

module.exports = {
  async braze_messages_send(node, msg, inputs, opts) {
    const d = inputs || {};
    let body = {};
    if (d.body) {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }
    const res = await utils.providerRequest(opts, '/messages/send', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.dispatch_id || '', name: 'messages.send', status: r.message || 'queued', raw: r };
  }
};
