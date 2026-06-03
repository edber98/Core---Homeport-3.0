const { utils } = require('./utils');

module.exports = {
  async mailgun_monthly_delete_delete_v5_accounts_subaccounts_subaccount_id_limit_custom_mo(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v5/accounts/subaccounts/{subaccount_id}/limit/custom/monthly";
    const subaccount_id = String(d.subaccount_id || '').trim();
    if (!subaccount_id) return { ok: false, error: 'subaccount_id requis.' };
    reqPath = reqPath.replace('{subaccount_id}', encodeURIComponent(subaccount_id));

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
