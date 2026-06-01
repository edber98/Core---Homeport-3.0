const { utils } = require('./utils');
module.exports = {
  async stability_ai_user_account_get(node, msg, inputs, opts) {
    const res = await utils.providerRequest(opts, '/v1/user/account', { method: 'GET' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, status: res.status || 200, message: 'Compte récupéré.', raw: r };
  }
};
