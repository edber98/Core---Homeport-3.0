const { utils } = require('./utils');

module.exports = {
  async plaid_investments_transactions_get(node, msg, inputs, opts) {
    const accessToken = String(inputs?.accessToken || '').trim();
    if (!accessToken) return { ok: false, error: 'Access token requis.' };

    const body = {
      access_token: accessToken,
      start_date: inputs?.startDate || '2026-01-01',
      end_date: inputs?.endDate || '2026-01-31'
    };
    if (inputs?.count || inputs?.offset) {
      body.options = {
        count: Number(inputs.count || 100),
        offset: Number(inputs.offset || 0)
      };
    }

    const res = await utils.plaidRequest(opts, '/investments/transactions/get', body);
    if (!res.ok) return res;

    return {
      ok: true,
      totalCount: String(res.data?.total_investment_transactions || 0),
      transactions: JSON.stringify(res.data?.investment_transactions || [])
    };
  }
};
