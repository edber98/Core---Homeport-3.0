const { utils } = require('./utils');
module.exports = {
  async substack_publication_get(node, msg, inputs, opts) {
    const res = await utils.providerRequest(opts, '/publication', { method: 'GET' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id || '', name: r.name || r.title || '', url: r.url || '', status: r.status || '', created_at: r.created_at || '', updated_at: r.updated_at || '', raw: r };
  }
};
