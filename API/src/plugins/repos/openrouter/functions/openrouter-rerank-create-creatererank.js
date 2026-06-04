const { utils } = require('./utils');

module.exports = {
  async openrouter_rerank_create_creatererank(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/rerank";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = utils.buildBodyFromInputs(d, [{"source":"model","target":"model","type":"text"},{"source":"rerankQuery","target":"query","type":"text"},{"source":"documents","target":"documents","type":"json"},{"source":"topN","target":"top_n","type":"number"},{"source":"returnDocuments","target":"return_documents","type":"checkbox"},{"source":"maxChunksPerDoc","target":"max_chunks_per_doc","type":"number"}]);
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
