const { utils } = require('./utils');
module.exports = {
  async substack_post_create(node, msg, inputs, opts) {
    const d = inputs || {};
    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else { try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; } }
    }
    const res = await utils.providerRequest(opts, '/posts', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id || '', name: r.title || r.name || '', url: r.url || '', status: r.status || '', created_at: r.created_at || '', updated_at: r.updated_at || '', raw: r };
  }
};
