const { utils } = require('./utils');

module.exports = {
  async plaid_liabilities_get(node, msg, inputs, opts) {
    const accessToken = String(inputs?.accessToken || '').trim();
    if (!accessToken) return { ok: false, error: 'Access token requis.' };

    const res = await utils.plaidRequest(opts, '/liabilities/get', { access_token: accessToken });
    if (!res.ok) return res;

    return {
      ok: true,
      status: 'ok',
      requestId: res.data?.request_id || '',
      liabilities: JSON.stringify(res.data?.liabilities || {}),
      accounts: JSON.stringify(res.data?.accounts || [])
    };
  }
};
