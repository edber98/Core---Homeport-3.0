const { utils } = require('./utils');
module.exports = {
  async substack_posts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.offset) query.offset = d.offset;
    if (d.status) query.status = d.status;
    const res = await utils.providerRequest(opts, '/posts', { method: 'GET', query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({ id: r.id || '', name: r.title || r.name || '', url: r.url || '', status: r.status || '', created_at: r.created_at || '', updated_at: r.updated_at || '', raw: r }));
    return { ok: true, items, totalCount: Number(payload.total || payload.count || items.length), nextCursor: payload.next_cursor || payload.next || null };
  }
};
