const { utils } = require('./utils');

module.exports = {
  async revolut_business_tax_rate_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/tax-rates/{taxRateId}";
    const taxrateid = String(d.taxrateid || '').trim();
    if (!taxrateid) return { ok: false, error: 'taxrateid requis.' };
    reqPath = reqPath.replace('{taxrateid}', encodeURIComponent(taxrateid));

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
