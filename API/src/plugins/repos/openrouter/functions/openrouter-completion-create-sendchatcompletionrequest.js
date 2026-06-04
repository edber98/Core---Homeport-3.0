const { utils } = require('./utils');

module.exports = {
  async openrouter_completion_create_sendchatcompletionrequest(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/chat/completions";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = utils.buildBodyFromInputs(d, [{"source":"model","target":"model","type":"text"},{"source":"messages","target":"messages","type":"json"},{"source":"models","target":"models","type":"json"},{"source":"provider","target":"provider","type":"json"},{"source":"transforms","target":"transforms","type":"json"},{"source":"route","target":"route","type":"text"},{"source":"temperature","target":"temperature","type":"number"},{"source":"topP","target":"top_p","type":"number"},{"source":"topK","target":"top_k","type":"number"},{"source":"frequencyPenalty","target":"frequency_penalty","type":"number"},{"source":"presencePenalty","target":"presence_penalty","type":"number"},{"source":"repetitionPenalty","target":"repetition_penalty","type":"number"},{"source":"maxTokens","target":"max_tokens","type":"number"},{"source":"responseFormat","target":"response_format","type":"json"},{"source":"stop","target":"stop","type":"json"},{"source":"stream","target":"stream","type":"checkbox"},{"source":"tools","target":"tools","type":"json"},{"source":"toolChoice","target":"tool_choice","type":"json"},{"source":"seed","target":"seed","type":"number"},{"source":"logprobs","target":"logprobs","type":"checkbox"},{"source":"topLogprobs","target":"top_logprobs","type":"number"},{"source":"metadata","target":"metadata","type":"json"}]);
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
