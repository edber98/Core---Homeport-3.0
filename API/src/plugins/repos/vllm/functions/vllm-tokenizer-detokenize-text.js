const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "model",
    "type": "text",
    "bodyPath": [
      "model"
    ]
  },
  {
    "key": "tokens",
    "type": "json",
    "bodyPath": [
      "tokens"
    ]
  }
];


module.exports = {
  async vllm_tokenizer_detokenize_text(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/detokenize";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    let body;
    try {
      body = utils.buildBodyFromFields(d, BODY_FIELDS);
    } catch (e) {
      return { ok: false, error: e.message };
    }

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
