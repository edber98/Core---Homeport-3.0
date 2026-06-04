const { utils } = require('./utils');

module.exports = {
  async front_imported_message_send_import_inbox_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/inboxes/{inbox_id}/imported_messages";
    const inbox_id = String(d.inbox_id || '').trim();
    if (!inbox_id) return { ok: false, error: 'inbox_id requis.' };
    reqPath = reqPath.replace('{inbox_id}', encodeURIComponent(inbox_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.sender !== undefined && d.sender !== null && d.sender !== '') {
      body["sender"] = d.sender;
    }
    if (d.sender_author_id !== undefined && d.sender_author_id !== null && d.sender_author_id !== '') {
      if (!body["sender"] || typeof body["sender"] !== 'object' || Array.isArray(body["sender"])) body["sender"] = {};
      body["sender"]["author_id"] = d.sender_author_id;
    }
    if (d.sender_name !== undefined && d.sender_name !== null && d.sender_name !== '') {
      if (!body["sender"] || typeof body["sender"] !== 'object' || Array.isArray(body["sender"])) body["sender"] = {};
      body["sender"]["name"] = d.sender_name;
    }
    if (d.sender_handle !== undefined && d.sender_handle !== null && d.sender_handle !== '') {
      if (!body["sender"] || typeof body["sender"] !== 'object' || Array.isArray(body["sender"])) body["sender"] = {};
      body["sender"]["handle"] = d.sender_handle;
    }
    if (d.to !== undefined && d.to !== null && d.to !== '') {
      body["to"] = d.to;
    }
    if (d.cc !== undefined && d.cc !== null && d.cc !== '') {
      body["cc"] = d.cc;
    }
    if (d.bcc !== undefined && d.bcc !== null && d.bcc !== '') {
      body["bcc"] = d.bcc;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      body["body"] = d.body;
    }
    if (d.body_format !== undefined && d.body_format !== null && d.body_format !== '') {
      body["body_format"] = d.body_format;
    }
    if (d.external_id !== undefined && d.external_id !== null && d.external_id !== '') {
      body["external_id"] = d.external_id;
    }
    if (d.created_at !== undefined && d.created_at !== null && d.created_at !== '') {
      body["created_at"] = d.created_at;
    }
    if (d.type !== undefined && d.type !== null && d.type !== '') {
      body["type"] = d.type;
    }
    if (d.assignee_id !== undefined && d.assignee_id !== null && d.assignee_id !== '') {
      body["assignee_id"] = d.assignee_id;
    }
    if (d.tags !== undefined && d.tags !== null && d.tags !== '') {
      body["tags"] = d.tags;
    }
    if (d.conversation_id !== undefined && d.conversation_id !== null && d.conversation_id !== '') {
      body["conversation_id"] = d.conversation_id;
    }
    if (d.metadata !== undefined && d.metadata !== null && d.metadata !== '') {
      body["metadata"] = d.metadata;
    }
    if (d.metadata_thread_ref !== undefined && d.metadata_thread_ref !== null && d.metadata_thread_ref !== '') {
      if (!body["metadata"] || typeof body["metadata"] !== 'object' || Array.isArray(body["metadata"])) body["metadata"] = {};
      body["metadata"]["thread_ref"] = d.metadata_thread_ref;
    }
    if (d.metadata_is_inbound !== undefined && d.metadata_is_inbound !== null && d.metadata_is_inbound !== '') {
      if (!body["metadata"] || typeof body["metadata"] !== 'object' || Array.isArray(body["metadata"])) body["metadata"] = {};
      body["metadata"]["is_inbound"] = d.metadata_is_inbound;
    }
    if (d.metadata_is_archived !== undefined && d.metadata_is_archived !== null && d.metadata_is_archived !== '') {
      if (!body["metadata"] || typeof body["metadata"] !== 'object' || Array.isArray(body["metadata"])) body["metadata"] = {};
      body["metadata"]["is_archived"] = d.metadata_is_archived;
    }
    if (d.metadata_should_skip_rules !== undefined && d.metadata_should_skip_rules !== null && d.metadata_should_skip_rules !== '') {
      if (!body["metadata"] || typeof body["metadata"] !== 'object' || Array.isArray(body["metadata"])) body["metadata"] = {};
      body["metadata"]["should_skip_rules"] = d.metadata_should_skip_rules;
    }
    if (d.attachments !== undefined && d.attachments !== null && d.attachments !== '') {
      body["attachments"] = d.attachments;
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


