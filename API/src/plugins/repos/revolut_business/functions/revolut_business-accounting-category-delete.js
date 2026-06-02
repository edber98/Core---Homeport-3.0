const { utils } = require('./utils');

module.exports = {
  async revolut_business_accounting_category_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/accounting-categories/{accountingCategoryId}";
    const accountingcategoryid = String(d.accountingcategoryid || '').trim();
    if (!accountingcategoryid) return { ok: false, error: 'accountingcategoryid requis.' };
    reqPath = reqPath.replace('{accountingcategoryid}', encodeURIComponent(accountingcategoryid));

    const query = {};
    

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
