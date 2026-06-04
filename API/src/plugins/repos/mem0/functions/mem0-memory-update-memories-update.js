const { utils } = require('./utils');

module.exports = {
  async mem0_memory_update_memories_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/memories/{memory_id}/";
    const memory_id = String(d.memory_id || '').trim();
    if (!memory_id) return { ok: false, error: 'memory_id requis.' };
    reqPath = reqPath.replace('{memory_id}', encodeURIComponent(memory_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.text !== undefined && d.text !== null && d.text !== '') {
      body["text"] = d.text;
    }
    if (d.metadata !== undefined && d.metadata !== null && d.metadata !== '') {
      body["metadata"] = d.metadata;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};

