const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "prompt",
    "type": "text",
    "bodyPath": [
      "prompt"
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
    "key": "model",
    "type": "text",
    "bodyPath": [
      "model"
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
    "key": "return_token_strs",
    "type": "checkbox",
    "bodyPath": [
      "return_token_strs"
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
    "key": "mm_processor_kwargs",
    "type": "json",
    "bodyPath": [
      "mm_processor_kwargs"
    ]
  },
  {
    "key": "tools",
    "type": "json",
    "bodyPath": [
      "tools"
    ]
  }
];


module.exports = {
  async vllm_tokenizer_tokenize_text(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/tokenize";
    

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
