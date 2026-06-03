const { utils } = require('./utils');

module.exports = {
  async calendly_generic_request(node, msg, inputs, opts) {
    const d = inputs || {};
    const path = String(d.path || '').trim();
    if (!path) return { ok: false, error: 'path requis.' };

    const method = String(d.method || 'GET').toUpperCase();
    let body;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

    const res = await utils.calendlyRequest(opts, path.startsWith('/') ? path : `/${path}`, { method, body });
    if (!res.ok) return res;
    return { ok: true, status: 'success', message: 'Requête exécutée.', raw: res.data || {} };
  }
};
