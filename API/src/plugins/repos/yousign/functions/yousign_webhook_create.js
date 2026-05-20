const { utils } = require('./utils');

module.exports = {
  async yousign_webhook_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const endpoint = String(d.endpoint || '').trim();
      if (!endpoint) return { ok: false, error: "L'URL du endpoint est requise." };
  
      let subscribed_events = [];
      if (d.subscribed_events) {
        if (typeof d.subscribed_events === 'string') {
          try { subscribed_events = JSON.parse(d.subscribed_events); } catch {
            subscribed_events = d.subscribed_events.split(',').map(s => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(d.subscribed_events)) {
          subscribed_events = d.subscribed_events;
        }
      }
      if (!subscribed_events.length) return { ok: false, error: 'Au moins un événement est requis.' };
  
      const body = { endpoint, subscribed_events };
      if (d.description) body.description = d.description;
      if (d.sandbox !== undefined) body.sandbox = d.sandbox === true || d.sandbox === 'true';
      if (d.auto_retry !== undefined) body.auto_retry = d.auto_retry === true || d.auto_retry === 'true';
      if (d.enabled !== undefined) body.enabled = d.enabled !== false && d.enabled !== 'false';
  
      log('Création en cours...');
      const res = await utils.yousignRequest(opts, 'POST', '/webhooks/subscriptions', body);
      if (!res.ok) return res;
      const w = res.data || {};
      return {
        ok: true,
        id: w.id || '',
        endpoint: w.endpoint || '',
        description: w.description || '',
        subscribed_events: w.subscribed_events || [],
        enabled: w.enabled !== false,
        sandbox: w.sandbox || false,
        auto_retry: w.auto_retry || false,
        created_at: w.created_at || '',
      };
    }
};
