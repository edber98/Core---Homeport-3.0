const { utils } = require('./utils');

module.exports = {
  async hunter_sequence_stop_sequence(node, msg, inputs, opts) {
    const d = inputs || {};
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };

    const reqPath = `/v2/campaigns/${encodeURIComponent(id)}/stop`;
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || id,
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || 'stopped',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
