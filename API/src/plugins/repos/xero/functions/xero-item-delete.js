const { utils } = require('./utils');

module.exports = {
  async xero_item_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/Items/{itemId}";
    const itemid = String(d.itemid || '').trim();
    if (!itemid) return { ok: false, error: 'itemid requis.' };
    reqPath = reqPath.replace('{itemid}', encodeURIComponent(itemid));

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
