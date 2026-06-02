const { utils } = require('./utils');

module.exports = {
  async ebay_notification_destination_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/commerce/notification/v1/destination/{destinationId}";
    const destinationid = String(d.destinationid || '').trim();
    if (!destinationid) return { ok: false, error: 'destinationid requis.' };
    reqPath = reqPath.replace('{destinationid}', encodeURIComponent(destinationid));

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
