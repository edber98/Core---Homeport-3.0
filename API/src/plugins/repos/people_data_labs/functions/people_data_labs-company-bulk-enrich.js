const { utils } = require('./utils');

module.exports = {
  async people_data_labs_company_bulk_enrich(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let body = d.body;
    if (body === undefined || body === null || body === '') {
      return { ok: false, error: 'body requis (JSON tableau d\'entreprises).' };
    }
    if (typeof body !== 'object') {
      try { body = JSON.parse(String(body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, '/v5/company/bulk', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.items) ? payload.items : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.company_id || r.uuid || ''),
      name: r && (r.name || r.company_name || r.title || ''),
      status: r && (r.status || r.state || ''),
      url: r && (r.website || r.url || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return { ok: true, items, totalCount: items.length, nextCursor: payload.next_cursor || null };
  }
};
