const { utils } = require('./utils');

module.exports = {
  async e2b_health_ping(node, msg, inputs, opts) {
    const res = await utils.providerRequest(opts, '/');
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      status: res.status,
      message: 'Service E2B joignable.',
      raw: res.data || null
    };
  }
};
