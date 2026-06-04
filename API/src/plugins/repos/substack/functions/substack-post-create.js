const { utils } = require('./utils');
module.exports = {
  async substack_post_create(node, msg, inputs, opts) {
    const d = inputs || {};
    let body = undefined;
    if (d.postContent !== undefined && d.postContent !== null && d.postContent !== '') {
      if (typeof d.postContent === 'object') body = d.postContent;
      else { try { body = JSON.parse(String(d.postContent)); } catch { return { ok: false, error: 'JSON invalide dans postContent.' }; } }
    }
    const res = await utils.providerRequest(opts, '/posts', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id || '', name: r.title || r.name || '', url: r.url || '', status: r.status || '', created_at: r.created_at || '', updated_at: r.updated_at || '', raw: r };
  }
};
