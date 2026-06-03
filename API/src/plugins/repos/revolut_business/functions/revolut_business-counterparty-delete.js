const { utils } = require('./utils');

module.exports = {
  async revolut_business_counterparty_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/counterparty/{counterpartyId}";
    const counterpartyid = String(d.counterpartyid || '').trim();
    if (!counterpartyid) return { ok: false, error: 'counterpartyid requis.' };
    reqPath = reqPath.replace('{counterpartyid}', encodeURIComponent(counterpartyid));

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
