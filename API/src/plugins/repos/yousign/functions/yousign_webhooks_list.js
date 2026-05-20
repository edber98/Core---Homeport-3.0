const { utils } = require('./utils');

module.exports = {
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
    }
};
