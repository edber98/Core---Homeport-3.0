const { utils } = require('./utils');

module.exports = {
  async xero_bank_transfer_create_history(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/BankTransfers/{bankTransferId}/History";
    const banktransferid = String(d.banktransferid || '').trim();
    if (!banktransferid) return { ok: false, error: 'banktransferid requis.' };
    reqPath = reqPath.replace('{banktransferid}', encodeURIComponent(banktransferid));

    const query = {};
    

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
