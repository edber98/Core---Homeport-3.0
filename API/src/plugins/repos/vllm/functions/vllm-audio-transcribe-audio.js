const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "file_name",
    "type": "text",
    "bodyPath": [
      "file_name"
    ]
  },
  {
    "key": "file_content_base64",
    "type": "textarea",
    "bodyPath": [
      "file_content_base64"
    ]
  },
  {
    "key": "file_content_type",
    "type": "text",
    "bodyPath": [
      "file_content_type"
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
    "key": "language",
    "type": "text",
    "bodyPath": [
      "language"
    ]
  },
  {
    "key": "hotwords",
    "type": "text",
    "bodyPath": [
      "hotwords"
    ]
  },
  {
    "key": "prompt",
    "type": "text",
    "bodyPath": [
      "prompt"
    ]
  },
  {
    "key": "response_format",
    "type": "text",
    "bodyPath": [
      "response_format"
    ]
  },
  {
    "key": "timestamp_granularities",
    "type": "json",
    "bodyPath": [
      "timestamp_granularities"
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
    "key": "stream_include_usage",
    "type": "checkbox",
    "bodyPath": [
      "stream_include_usage"
    ]
  },
  {
    "key": "stream_continuous_usage_stats",
    "type": "checkbox",
    "bodyPath": [
      "stream_continuous_usage_stats"
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
    "key": "to_language",
    "type": "text",
    "bodyPath": [
      "to_language"
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
    "key": "n",
    "type": "number",
    "bodyPath": [
      "n"
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
    "key": "include_stop_str_in_output",
    "type": "checkbox",
    "bodyPath": [
      "include_stop_str_in_output"
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
    "key": "seed",
    "type": "number",
    "bodyPath": [
      "seed"
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
    "key": "repetition_penalty",
    "type": "number",
    "bodyPath": [
      "repetition_penalty"
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
    "key": "max_completion_tokens",
    "type": "number",
    "bodyPath": [
      "max_completion_tokens"
    ]
  }
];


module.exports = {
  async vllm_audio_transcribe_audio(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/audio/transcriptions";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const fileName = String(d.file_name || '').trim();
    const fileContentBase64 = d.file_content_base64;
    if (!fileName) return { ok: false, error: 'file_name requis.' };
    if (!fileContentBase64) return { ok: false, error: 'file_content_base64 requis.' };

    let fileBuffer;
    try {
      fileBuffer = Buffer.from(String(fileContentBase64), 'base64');
    } catch {
      return { ok: false, error: 'Base64 invalide dans file_content_base64.' };
    }

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: String(d.file_content_type || 'application/octet-stream') }), fileName);

    for (const field of BODY_FIELDS) {
      if (field.key === 'file_name' || field.key === 'file_content_base64' || field.key === 'file_content_type') continue;
      let partial;
      try {
        partial = utils.buildBodyFromFields(d, [field]);
      } catch (e) {
        return { ok: false, error: e.message };
      }
      if (!partial) continue;
      const apiKey = field.bodyPath[0];
      utils.appendFormValue(formData, apiKey, partial[apiKey]);
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, formData });
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
