const { utils } = require('./utils');

module.exports = {
  async front_message_send_create_message_reply(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/conversations/{conversation_id}/messages";
    const conversation_id = String(d.conversation_id || '').trim();
    if (!conversation_id) return { ok: false, error: 'conversation_id requis.' };
    reqPath = reqPath.replace('{conversation_id}', encodeURIComponent(conversation_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.to !== undefined && d.to !== null && d.to !== '') {
      body["to"] = d.to;
    }
    if (d.cc !== undefined && d.cc !== null && d.cc !== '') {
      body["cc"] = d.cc;
    }
    if (d.bcc !== undefined && d.bcc !== null && d.bcc !== '') {
      body["bcc"] = d.bcc;
    }
    if (d.sender_name !== undefined && d.sender_name !== null && d.sender_name !== '') {
      body["sender_name"] = d.sender_name;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.author_id !== undefined && d.author_id !== null && d.author_id !== '') {
      body["author_id"] = d.author_id;
    }
    if (d.channel_id !== undefined && d.channel_id !== null && d.channel_id !== '') {
      body["channel_id"] = d.channel_id;
    }
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      body["body"] = d.body;
    }
    if (d.text !== undefined && d.text !== null && d.text !== '') {
      body["text"] = d.text;
    }
    if (d.quote_body !== undefined && d.quote_body !== null && d.quote_body !== '') {
      body["quote_body"] = d.quote_body;
    }
    if (d.options !== undefined && d.options !== null && d.options !== '') {
      body["options"] = d.options;
    }
    if (d.options_tag_ids !== undefined && d.options_tag_ids !== null && d.options_tag_ids !== '') {
      if (!body["options"] || typeof body["options"] !== 'object' || Array.isArray(body["options"])) body["options"] = {};
      body["options"]["tag_ids"] = d.options_tag_ids;
    }
    if (d.options_archive !== undefined && d.options_archive !== null && d.options_archive !== '') {
      if (!body["options"] || typeof body["options"] !== 'object' || Array.isArray(body["options"])) body["options"] = {};
      body["options"]["archive"] = d.options_archive;
    }
    if (d.attachments !== undefined && d.attachments !== null && d.attachments !== '') {
      body["attachments"] = d.attachments;
    }
    if (d.signature_id !== undefined && d.signature_id !== null && d.signature_id !== '') {
      body["signature_id"] = d.signature_id;
    }
    if (d.should_add_default_signature !== undefined && d.should_add_default_signature !== null && d.should_add_default_signature !== '') {
      body["should_add_default_signature"] = d.should_add_default_signature;
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


