const { utils } = require('./utils');

module.exports = {
  async plaid_transactions_recurring_get(node, msg, inputs, opts) {
    const accessToken = String(inputs?.accessToken || '').trim();
    if (!accessToken) return { ok: false, error: 'Access token requis.' };

    const res = await utils.plaidRequest(opts, '/transactions/recurring/get', { access_token: accessToken });
    if (!res.ok) return res;

    return {
      ok: true,
      status: 'ok',
      requestId: res.data?.request_id || '',
      inflowStreams: JSON.stringify(res.data?.inflow_streams || []),
      outflowStreams: JSON.stringify(res.data?.outflow_streams || [])
    };
  }
};
