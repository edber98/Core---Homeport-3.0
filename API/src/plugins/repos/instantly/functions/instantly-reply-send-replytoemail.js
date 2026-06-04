const { utils } = require('./utils');

module.exports = {
  async instantly_reply_send_replytoemail(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/emails/reply";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.eaccount !== undefined && d.eaccount !== null && d.eaccount !== '') {
      body["eaccount"] = d.eaccount;
    }
    if (d.reply_to_uuid !== undefined && d.reply_to_uuid !== null && d.reply_to_uuid !== '') {
      body["reply_to_uuid"] = d.reply_to_uuid;
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
    if (d.body_text !== undefined && d.body_text !== null && d.body_text !== '') {
      if (!body["body"] || typeof body["body"] !== 'object' || Array.isArray(body["body"])) body["body"] = {};
      body["body"]["text"] = d.body_text;
    }
    if (d.cc_address_email_list !== undefined && d.cc_address_email_list !== null && d.cc_address_email_list !== '') {
      body["cc_address_email_list"] = d.cc_address_email_list;
    }
    if (d.bcc_address_email_list !== undefined && d.bcc_address_email_list !== null && d.bcc_address_email_list !== '') {
      body["bcc_address_email_list"] = d.bcc_address_email_list;
    }
    if (d.reminder_ts !== undefined && d.reminder_ts !== null && d.reminder_ts !== '') {
      body["reminder_ts"] = d.reminder_ts;
    }
    if (d.assigned_to !== undefined && d.assigned_to !== null && d.assigned_to !== '') {
      body["assigned_to"] = d.assigned_to;
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


