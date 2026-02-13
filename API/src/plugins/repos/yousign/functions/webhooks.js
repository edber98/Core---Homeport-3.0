const { utils } = require('./utils');

module.exports = {
  // ── Créer un webhook ───────────────────────────────────
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
  },

  // ── Lister les webhooks ────────────────────────────────
  async yousign_webhooks_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.yousignRequest(opts, 'GET', '/webhooks');
    if (!res.ok) return res;
    const raw = res.data || {};
    const items = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    const webhooks = items.map(w => ({
      id: w.id || '',
      endpoint: w.endpoint || '',
      description: w.description || '',
      subscribed_events: w.subscribed_events || [],
      enabled: w.enabled !== false,
      sandbox: w.sandbox || false,
      created_at: w.created_at || '',
    }));
    return { ok: true, webhooks, totalCount: String(webhooks.length) };
  },

  // ── Supprimer un webhook ───────────────────────────────
  async yousign_webhook_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const id = String(d.webhook_id || '').trim();
    if (!id) return { ok: false, error: "L'ID du webhook est requis." };

    log('Suppression en cours...');
    const res = await utils.yousignRequest(opts, 'DELETE', `/webhooks/${encodeURIComponent(id)}`);
    if (!res.ok) return res;
    return { ok: true, deleted: true, id };
  },

  // ── Événement webhook (trigger event handler) ──────────
  async yousign_webhook_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = (msg && msg.payload) || {};
    return {
      ok: true,
      event_name: data.event_name || '',
      event_time: data.event_time || '',
      signature_request_id: data.data?.signature_request?.id || '',
      signature_request_name: data.data?.signature_request?.name || '',
      signature_request_status: data.data?.signature_request?.status || '',
      signer_id: data.data?.signer?.id || '',
      signer_email: data.data?.signer?.info?.email || '',
      raw: data,
    };
  },
};
