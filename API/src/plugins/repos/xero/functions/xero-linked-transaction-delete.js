const { utils } = require('./utils');

module.exports = {
  async xero_linked_transaction_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/LinkedTransactions/{linkedTransactionId}";
    const linkedtransactionid = String(d.linkedtransactionid || '').trim();
    if (!linkedtransactionid) return { ok: false, error: 'linkedtransactionid requis.' };
    reqPath = reqPath.replace('{linkedtransactionid}', encodeURIComponent(linkedtransactionid));

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
