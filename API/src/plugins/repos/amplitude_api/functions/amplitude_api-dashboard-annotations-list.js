const { utils } = require('./utils');

module.exports = {
  async amplitude_api_dashboard_annotations_list(node, msg, inputs, opts) {
    const d = inputs || {};
    let query = {};
    try { query = utils.parseJsonInput(d.query, 'query', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }
    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    const res = await utils.providerRequest(opts, '/api/3/annotations', { method: 'GET', query, headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.annotations) ? payload.annotations : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || ''),
      name: r && (r.label || r.name || ''),
      url: '',
      status: r && (r.level || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));
    return { ok: true, items, totalCount: Number(payload.total || payload.count || items.length), nextCursor: payload.next || null };
  }
};
