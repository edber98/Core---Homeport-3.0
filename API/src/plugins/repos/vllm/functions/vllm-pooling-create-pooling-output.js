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
    "key": "embedding_input",
    "type": "json",
    "bodyPath": [
      "input"
    ]
  },
  {
    "key": "messages",
    "type": "json",
    "bodyPath": [
      "messages"
    ]
  },
  {
    "key": "add_generation_prompt",
    "type": "checkbox",
    "bodyPath": [
      "add_generation_prompt"
    ]
  },
  {
    "key": "continue_final_message",
    "type": "checkbox",
    "bodyPath": [
      "continue_final_message"
    ]
  },
  {
    "key": "add_special_tokens",
    "type": "checkbox",
    "bodyPath": [
      "add_special_tokens"
    ]
  },
  {
    "key": "chat_template",
    "type": "text",
    "bodyPath": [
      "chat_template"
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
    "key": "media_io_kwargs",
    "type": "json",
    "bodyPath": [
      "media_io_kwargs"
    ]
  },
  {
    "key": "encoding_format",
    "type": "text",
    "bodyPath": [
      "encoding_format"
    ]
  },
  {
    "key": "embed_dtype",
    "type": "text",
    "bodyPath": [
      "embed_dtype"
    ]
  },
  {
    "key": "endianness",
    "type": "text",
    "bodyPath": [
      "endianness"
    ]
  },
  {
    "key": "dimensions",
    "type": "number",
    "bodyPath": [
      "dimensions"
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
    "key": "task",
    "type": "text",
    "bodyPath": [
      "task"
    ]
  },
  {
    "key": "plugin_data",
    "type": "json",
    "bodyPath": [
      "data"
    ]
  }
];


module.exports = {
  async vllm_pooling_create_pooling_output(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/pooling";
    

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
