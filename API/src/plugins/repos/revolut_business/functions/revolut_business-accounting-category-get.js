const { utils } = require('./utils');

module.exports = {
  async revolut_business_accounting_category_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/accounting-categories/{accountingCategoryId}";
    const accountingcategoryid = String(d.accountingcategoryid || '').trim();
    if (!accountingcategoryid) return { ok: false, error: 'accountingcategoryid requis.' };
    reqPath = reqPath.replace('{accountingcategoryid}', encodeURIComponent(accountingcategoryid));

    const query = {};
    

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      ...(r && typeof r === 'object' ? r : { value: r }),
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
