const { utils } = require('./utils');

module.exports = {
  async instantly_email_verification_send_createemailverification(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/email-verification";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.email !== undefined && d.email !== null && d.email !== '') {
      body["email"] = d.email;
    }
    if (d.webhook_url !== undefined && d.webhook_url !== null && d.webhook_url !== '') {
      body["webhook_url"] = d.webhook_url;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

