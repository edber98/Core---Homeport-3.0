const { utils } = require('./utils');

module.exports = {
  async milvus_entity_count_entities(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = d.body && typeof d.body === 'object' ? d.body : (() => {
      if (d.body === undefined || d.body === null || d.body === '') return {};
      try { return JSON.parse(String(d.body)); } catch { return null; }
    })();
    if (body === null) return { ok: false, error: 'JSON invalide dans body.' };

    const res = await utils.providerRequest(opts, '/v2/vectordb/entities/count', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    return {
      ok: true,
      id: '',
      name: 'count',
      url: '',
      status: 'ok',
      created_at: '',
      updated_at: '',
      raw: payload,
      count: Number(payload.data?.count ?? payload.count ?? 0)
    };
  }
};
