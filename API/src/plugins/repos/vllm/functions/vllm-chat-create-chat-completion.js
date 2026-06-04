const { utils } = require('./utils');

const BODY_FIELDS = [
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
    "key": "frequency_penalty",
    "type": "number",
    "bodyPath": [
      "frequency_penalty"
    ]
  },
  {
    "key": "logit_bias",
    "type": "json",
    "bodyPath": [
      "logit_bias"
    ]
  },
  {
    "key": "logprobs",
    "type": "checkbox",
    "bodyPath": [
      "logprobs"
    ]
  },
  {
    "key": "top_logprobs",
    "type": "number",
    "bodyPath": [
      "top_logprobs"
    ]
  },
  {
    "key": "max_tokens",
    "type": "number",
    "bodyPath": [
      "max_tokens"
    ]
  },
  {
    "key": "max_completion_tokens",
    "type": "number",
    "bodyPath": [
      "max_completion_tokens"
    ]
  },
  {
    "key": "n",
    "type": "number",
    "bodyPath": [
      "n"
    ]
  },
  {
    "key": "presence_penalty",
    "type": "number",
    "bodyPath": [
      "presence_penalty"
    ]
  },
  {
    "key": "response_format",
    "type": "json",
    "bodyPath": [
      "response_format"
    ]
  },
  {
    "key": "seed",
    "type": "number",
    "bodyPath": [
      "seed"
    ]
  },
  {
    "key": "stop",
    "type": "json",
    "bodyPath": [
      "stop"
    ]
  },
  {
    "key": "stream",
    "type": "checkbox",
    "bodyPath": [
      "stream"
    ]
  },
  {
    "key": "stream_options",
    "type": "json",
    "bodyPath": [
      "stream_options"
    ]
  },
  {
    "key": "temperature",
    "type": "number",
    "bodyPath": [
      "temperature"
    ]
  },
  {
    "key": "top_p",
    "type": "number",
    "bodyPath": [
      "top_p"
    ]
  },
  {
    "key": "tools",
    "type": "json",
    "bodyPath": [
      "tools"
    ]
  },
  {
    "key": "tool_choice",
    "type": "json",
    "bodyPath": [
      "tool_choice"
    ]
  },
  {
    "key": "reasoning_effort",
    "type": "text",
    "bodyPath": [
      "reasoning_effort"
    ]
  },
  {
    "key": "thinking_token_budget",
    "type": "json",
    "bodyPath": [
      "thinking_token_budget"
    ]
  },
  {
    "key": "include_reasoning",
    "type": "checkbox",
    "bodyPath": [
      "include_reasoning"
    ]
  },
  {
    "key": "parallel_tool_calls",
    "type": "checkbox",
    "bodyPath": [
      "parallel_tool_calls"
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
    "key": "use_beam_search",
    "type": "checkbox",
    "bodyPath": [
      "use_beam_search"
    ]
  },
  {
    "key": "top_k",
    "type": "number",
    "bodyPath": [
      "top_k"
    ]
  },
  {
    "key": "min_p",
    "type": "number",
    "bodyPath": [
      "min_p"
    ]
  },
  {
    "key": "repetition_penalty",
    "type": "number",
    "bodyPath": [
      "repetition_penalty"
    ]
  },
  {
    "key": "length_penalty",
    "type": "number",
    "bodyPath": [
      "length_penalty"
    ]
  },
  {
    "key": "stop_token_ids",
    "type": "json",
    "bodyPath": [
      "stop_token_ids"
    ]
  },
  {
    "key": "include_stop_str_in_output",
    "type": "checkbox",
    "bodyPath": [
      "include_stop_str_in_output"
    ]
  },
  {
    "key": "ignore_eos",
    "type": "checkbox",
    "bodyPath": [
      "ignore_eos"
    ]
  },
  {
    "key": "min_tokens",
    "type": "number",
    "bodyPath": [
      "min_tokens"
    ]
  },
  {
    "key": "skip_special_tokens",
    "type": "checkbox",
    "bodyPath": [
      "skip_special_tokens"
    ]
  },
  {
    "key": "spaces_between_special_tokens",
    "type": "checkbox",
    "bodyPath": [
      "spaces_between_special_tokens"
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
    "key": "prompt_logprobs",
    "type": "number",
    "bodyPath": [
      "prompt_logprobs"
    ]
  },
  {
    "key": "allowed_token_ids",
    "type": "json",
    "bodyPath": [
      "allowed_token_ids"
    ]
  },
  {
    "key": "bad_words",
    "type": "json",
    "bodyPath": [
      "bad_words"
    ]
  },
  {
    "key": "echo",
    "type": "checkbox",
    "bodyPath": [
      "echo"
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
    "key": "documents",
    "type": "json",
    "bodyPath": [
      "documents"
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
    "key": "structured_outputs",
    "type": "json",
    "bodyPath": [
      "structured_outputs"
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
    "key": "request_id",
    "type": "text",
    "bodyPath": [
      "request_id"
    ]
  },
  {
    "key": "return_tokens_as_token_ids",
    "type": "checkbox",
    "bodyPath": [
      "return_tokens_as_token_ids"
    ]
  },
  {
    "key": "return_token_ids",
    "type": "checkbox",
    "bodyPath": [
      "return_token_ids"
    ]
  },
  {
    "key": "return_prompt_text",
    "type": "checkbox",
    "bodyPath": [
      "return_prompt_text"
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
    "key": "kv_transfer_params",
    "type": "json",
    "bodyPath": [
      "kv_transfer_params"
    ]
  },
  {
    "key": "vllm_xargs",
    "type": "json",
    "bodyPath": [
      "vllm_xargs"
    ]
  },
  {
    "key": "repetition_detection",
    "type": "json",
    "bodyPath": [
      "repetition_detection"
    ]
  }
];


module.exports = {
  async vllm_chat_create_chat_completion(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/chat/completions";
    

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
