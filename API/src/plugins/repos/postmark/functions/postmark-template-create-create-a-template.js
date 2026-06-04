const { utils } = require('./utils');

module.exports = {
  async postmark_template_create_create_a_template(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/templates";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = utils.buildBodyFromInputs(d, [{"source":"Name","target":"Name","type":"text"},{"source":"Subject","target":"Subject","type":"text"},{"source":"HtmlBody","target":"HtmlBody","type":"textarea"},{"source":"TextBody","target":"TextBody","type":"textarea"},{"source":"Alias","target":"Alias","type":"text"},{"source":"TemplateType","target":"TemplateType","type":"text"},{"source":"LayoutTemplate","target":"LayoutTemplate","type":"text"}]);
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
