const { utils } = require('./utils');

module.exports = {
  async openrouter_respons_create_createresponses(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/responses";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = utils.buildBodyFromInputs(d, [{"source":"model","target":"model","type":"text"},{"source":"responseInput","target":"input","type":"json"},{"source":"instructions","target":"instructions","type":"textarea"},{"source":"tools","target":"tools","type":"json"},{"source":"toolChoice","target":"tool_choice","type":"json"},{"source":"temperature","target":"temperature","type":"number"},{"source":"maxOutputTokens","target":"max_output_tokens","type":"number"},{"source":"text","target":"text","type":"json"},{"source":"reasoning","target":"reasoning","type":"json"},{"source":"metadata","target":"metadata","type":"json"},{"source":"store","target":"store","type":"checkbox"}]);
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
