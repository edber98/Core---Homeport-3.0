const { utils } = require('./utils');

module.exports = {
  async front_conversation_comment_create_conversation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/conversations";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.type !== undefined && d.type !== null && d.type !== '') {
      body["type"] = d.type;
    }
    if (d.inbox_id !== undefined && d.inbox_id !== null && d.inbox_id !== '') {
      body["inbox_id"] = d.inbox_id;
    }
    if (d.teammate_ids !== undefined && d.teammate_ids !== null && d.teammate_ids !== '') {
      body["teammate_ids"] = d.teammate_ids;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.comment !== undefined && d.comment !== null && d.comment !== '') {
      body["comment"] = d.comment;
    }
    if (d.comment_author_id !== undefined && d.comment_author_id !== null && d.comment_author_id !== '') {
      if (!body["comment"] || typeof body["comment"] !== 'object' || Array.isArray(body["comment"])) body["comment"] = {};
      body["comment"]["author_id"] = d.comment_author_id;
    }
    if (d.comment_body !== undefined && d.comment_body !== null && d.comment_body !== '') {
      if (!body["comment"] || typeof body["comment"] !== 'object' || Array.isArray(body["comment"])) body["comment"] = {};
      body["comment"]["body"] = d.comment_body;
    }
    if (d.comment_attachments !== undefined && d.comment_attachments !== null && d.comment_attachments !== '') {
      if (!body["comment"] || typeof body["comment"] !== 'object' || Array.isArray(body["comment"])) body["comment"] = {};
      body["comment"]["attachments"] = d.comment_attachments;
    }
    if (d.custom_fields !== undefined && d.custom_fields !== null && d.custom_fields !== '') {
      body["custom_fields"] = d.custom_fields;
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

