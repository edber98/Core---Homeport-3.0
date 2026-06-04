const { utils } = require('./utils');

module.exports = {
  async openrouter_transcription_create_createaudiotranscriptions(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/audio/transcriptions";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = utils.buildBodyFromInputs(d, [{"source":"fileBase64","target":"fileBase64","type":"textarea"},{"source":"fileName","target":"fileName","type":"text"},{"source":"mimeType","target":"mimeType","type":"text"},{"source":"model","target":"model","type":"text"},{"source":"language","target":"language","type":"text"},{"source":"prompt","target":"prompt","type":"textarea"},{"source":"responseFormat","target":"response_format","type":"text"},{"source":"temperature","target":"temperature","type":"number"},{"source":"timestampGranularities","target":"timestamp_granularities","type":"json"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
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
