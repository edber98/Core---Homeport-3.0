const { utils } = require('./utils');

module.exports = {
  async talkdesk_credential_delete_erc_ecommerce_shopify_webhooks_handler_credentials_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/erc/ecommerce/shopify-webhooks-handler/credentials";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

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
