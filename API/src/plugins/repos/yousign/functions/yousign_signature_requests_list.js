const { utils } = require('./utils');

module.exports = {
  async yousign_signature_requests_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const qs = utils.buildQueryString({
        status: d.status || undefined,
        limit: d.limit || 100,
        after: d.after || undefined,
        q: d.q || undefined,
        external_id: d.external_id || undefined,
      });
  
      log('Récupération de la liste...');
      const res = await utils.yousignRequest(opts, 'GET', `/signature_requests${qs}`);
      if (!res.ok) return res;
      const raw = res.data || {};
      const items = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      const requests = items.map(sr => ({
        id: sr.id || '',
        name: sr.name || '',
        status: sr.status || '',
        delivery_mode: sr.delivery_mode || '',
        created_at: sr.created_at || '',
        expiration_date: sr.expiration_date || '',
      }));
      return { ok: true, requests, totalCount: String(requests.length) };
    }
};
