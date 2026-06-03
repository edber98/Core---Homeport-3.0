const { utils } = require('./utils');

module.exports = {
  async perplexity_models_list(node, msg, inputs, opts) {
    const res = await utils.perplexityRequest(opts, '/models');
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const rawItems = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data?.models) ? res.data.models : [];
    const items = rawItems.map((m) => ({
      id: m.id || m.model || '',
      name: m.id || m.model || m.name || '',
      status: m.status || '',
      url: '',
      result_json: utils.compactJson(m)
    }));

    return { ok: true, items, totalCount: items.length, nextCursor: '' };
  }
};
