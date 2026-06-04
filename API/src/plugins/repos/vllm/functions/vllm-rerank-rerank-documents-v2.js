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
    "key": "user",
    "type": "text",
    "bodyPath": [
      "user"
    ]
  },
  {
    "key": "truncate_prompt_tokens",
    "type": "number",
    "bodyPath": [
      "truncate_prompt_tokens"
    ]
  },
  {
    "key": "truncation_side",
    "type": "text",
    "bodyPath": [
      "truncation_side"
    ]
  },
  {
    "key": "request_id",
    "type": "text",
    "bodyPath": [
      "request_id"
    ]
  },
  {
    "key": "priority",
    "type": "number",
    "bodyPath": [
      "priority"
    ]
  },
  {
    "key": "mm_processor_kwargs",
    "type": "json",
    "bodyPath": [
      "mm_processor_kwargs"
    ]
  },
  {
    "key": "cache_salt",
    "type": "text",
    "bodyPath": [
      "cache_salt"
    ]
  },
  {
    "key": "use_activation",
    "type": "checkbox",
    "bodyPath": [
      "use_activation"
    ]
  },
  {
    "key": "max_tokens_per_query",
    "type": "number",
    "bodyPath": [
      "max_tokens_per_query"
    ]
  },
  {
    "key": "max_tokens_per_doc",
    "type": "number",
    "bodyPath": [
      "max_tokens_per_doc"
    ]
  },
  {
    "key": "instruction",
    "type": "text",
    "bodyPath": [
      "instruction"
    ]
  },
  {
    "key": "chat_template_kwargs",
    "type": "json",
    "bodyPath": [
      "chat_template_kwargs"
    ]
  },
  {
    "key": "user_query",
    "type": "json",
    "bodyPath": [
      "query"
    ]
  },
  {
    "key": "documents",
    "type": "json",
    "bodyPath": [
      "documents"
    ]
  },
  {
    "key": "top_n",
    "type": "number",
    "bodyPath": [
      "top_n"
    ]
  }
];


module.exports = {
  async vllm_rerank_rerank_documents_v2(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/rerank";
    

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
