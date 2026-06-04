const { utils } = require('./utils');

module.exports = {
  async front_inbound_message_create_sync_inbound_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/channels/{channel_id}/inbound_messages";
    const channel_id = String(d.channel_id || '').trim();
    if (!channel_id) return { ok: false, error: 'channel_id requis.' };
    reqPath = reqPath.replace('{channel_id}', encodeURIComponent(channel_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.sender !== undefined && d.sender !== null && d.sender !== '') {
      body["sender"] = d.sender;
    }
    if (d.sender_name !== undefined && d.sender_name !== null && d.sender_name !== '') {
      if (!body["sender"] || typeof body["sender"] !== 'object' || Array.isArray(body["sender"])) body["sender"] = {};
      body["sender"]["name"] = d.sender_name;
    }
    if (d.sender_handle !== undefined && d.sender_handle !== null && d.sender_handle !== '') {
      if (!body["sender"] || typeof body["sender"] !== 'object' || Array.isArray(body["sender"])) body["sender"] = {};
      body["sender"]["handle"] = d.sender_handle;
    }
    if (d.sender_email !== undefined && d.sender_email !== null && d.sender_email !== '') {
      if (!body["sender"] || typeof body["sender"] !== 'object' || Array.isArray(body["sender"])) body["sender"] = {};
      body["sender"]["email"] = d.sender_email;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      body["body"] = d.body;
    }
    if (d.metadata !== undefined && d.metadata !== null && d.metadata !== '') {
      body["metadata"] = d.metadata;
    }
    if (d.metadata_external_id !== undefined && d.metadata_external_id !== null && d.metadata_external_id !== '') {
      if (!body["metadata"] || typeof body["metadata"] !== 'object' || Array.isArray(body["metadata"])) body["metadata"] = {};
      body["metadata"]["external_id"] = d.metadata_external_id;
    }
    if (d.metadata_external_conversation_id !== undefined && d.metadata_external_conversation_id !== null && d.metadata_external_conversation_id !== '') {
      if (!body["metadata"] || typeof body["metadata"] !== 'object' || Array.isArray(body["metadata"])) body["metadata"] = {};
      body["metadata"]["external_conversation_id"] = d.metadata_external_conversation_id;
    }
    if (d.metadata_referenced_message_external_id !== undefined && d.metadata_referenced_message_external_id !== null && d.metadata_referenced_message_external_id !== '') {
      if (!body["metadata"] || typeof body["metadata"] !== 'object' || Array.isArray(body["metadata"])) body["metadata"] = {};
      body["metadata"]["referenced_message_external_id"] = d.metadata_referenced_message_external_id;
    }
    if (d.delivered_at !== undefined && d.delivered_at !== null && d.delivered_at !== '') {
      body["delivered_at"] = d.delivered_at;
    }
    if (d.attachments !== undefined && d.attachments !== null && d.attachments !== '') {
      body["attachments"] = d.attachments;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};


