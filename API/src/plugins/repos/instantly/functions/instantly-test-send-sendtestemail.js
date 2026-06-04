const { utils } = require('./utils');

module.exports = {
  async instantly_test_send_sendtestemail(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/emails/test";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.eaccount !== undefined && d.eaccount !== null && d.eaccount !== '') {
      body["eaccount"] = d.eaccount;
    }
    if (d.to_address_email_list !== undefined && d.to_address_email_list !== null && d.to_address_email_list !== '') {
      body["to_address_email_list"] = d.to_address_email_list;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      body["body"] = d.body;
    }
    if (d.body_html !== undefined && d.body_html !== null && d.body_html !== '') {
      if (!body["body"] || typeof body["body"] !== 'object' || Array.isArray(body["body"])) body["body"] = {};
      body["body"]["html"] = d.body_html;
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


