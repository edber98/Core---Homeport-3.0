const { utils } = require('./utils');

module.exports = {
  async postmark_template_update_updatetemplate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/templates/{templateIdOrAlias}";
    const templateidoralias = String(d.templateidoralias || '').trim();
    if (!templateidoralias) return { ok: false, error: 'templateidoralias requis.' };
    reqPath = reqPath.replace('{templateidoralias}', encodeURIComponent(templateidoralias));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let body = undefined;
    if (d.emailBatch !== undefined && d.emailBatch !== null && d.emailBatch !== '') {
      if (typeof d.emailBatch === 'object') body = d.emailBatch;
      else {
        try { body = JSON.parse(String(d.emailBatch)); } catch { return { ok: false, error: 'JSON invalide dans emailBatch.' }; }
      }
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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
