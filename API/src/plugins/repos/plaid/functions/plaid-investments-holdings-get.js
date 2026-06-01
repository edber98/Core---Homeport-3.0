const { utils } = require('./utils');

module.exports = {
  async plaid_investments_holdings_get(node, msg, inputs, opts) {
    const accessToken = String(inputs?.accessToken || '').trim();
    if (!accessToken) return { ok: false, error: 'Access token requis.' };

    const body = { access_token: accessToken };
    if (inputs?.accountIds) body.options = { account_ids: utils.list(inputs.accountIds, []) };

    const res = await utils.plaidRequest(opts, '/investments/holdings/get', body);
    if (!res.ok) return res;

    return {
      ok: true,
      status: 'ok',
      requestId: res.data?.request_id || '',
      holdings: JSON.stringify(res.data?.holdings || []),
      securities: JSON.stringify(res.data?.securities || []),
      accounts: JSON.stringify(res.data?.accounts || [])
    };
  }
};
