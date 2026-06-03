const { utils } = require('./utils');
module.exports = {
  async substack_post_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const post_id = String(d.post_id || '').trim();
    if (!post_id) return { ok: false, error: 'post_id requis.' };
    const res = await utils.providerRequest(opts, `/posts/${encodeURIComponent(post_id)}`, { method: 'GET' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id || post_id, name: r.title || r.name || '', url: r.url || '', status: r.status || '', created_at: r.created_at || '', updated_at: r.updated_at || '', raw: r };
  }
};
