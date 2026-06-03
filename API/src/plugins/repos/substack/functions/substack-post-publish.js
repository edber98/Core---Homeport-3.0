const { utils } = require('./utils');
module.exports = {
  async substack_post_publish(node, msg, inputs, opts) {
    const d = inputs || {};
    const post_id = String(d.post_id || '').trim();
    if (!post_id) return { ok: false, error: 'post_id requis.' };
    const res = await utils.providerRequest(opts, `/posts/${encodeURIComponent(post_id)}/publish`, { method: 'POST', body: {} });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id || post_id, name: r.title || r.name || '', status: r.status || 'published', raw: r };
  }
};
