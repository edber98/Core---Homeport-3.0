const { utils } = require('./utils');

module.exports = {
  async revolut_business_card_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/cards/{cardId}";
    const cardid = String(d.cardid || '').trim();
    if (!cardid) return { ok: false, error: 'cardid requis.' };
    reqPath = reqPath.replace('{cardid}', encodeURIComponent(cardid));

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
