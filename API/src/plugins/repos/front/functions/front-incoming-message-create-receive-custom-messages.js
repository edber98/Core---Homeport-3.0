const { utils } = require('./utils');

module.exports = {
  async front_incoming_message_create_receive_custom_messages(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/channels/{channel_id}/incoming_messages";
    const channel_id = String(d.channel_id || '').trim();
    if (!channel_id) return { ok: false, error: 'channel_id requis.' };
    reqPath = reqPath.replace('{channel_id}', encodeURIComponent(channel_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.sender !== undefined && d.sender !== null && d.sender !== '') {
      body["sender"] = d.sender;
    }
    if (d.sender_contact_id !== undefined && d.sender_contact_id !== null && d.sender_contact_id !== '') {
      if (!body["sender"] || typeof body["sender"] !== 'object' || Array.isArray(body["sender"])) body["sender"] = {};
      body["sender"]["contact_id"] = d.sender_contact_id;
    }
    if (d.sender_name !== undefined && d.sender_name !== null && d.sender_name !== '') {
      if (!body["sender"] || typeof body["sender"] !== 'object' || Array.isArray(body["sender"])) body["sender"] = {};
      body["sender"]["name"] = d.sender_name;
    }
    if (d.sender_handle !== undefined && d.sender_handle !== null && d.sender_handle !== '') {
      if (!body["sender"] || typeof body["sender"] !== 'object' || Array.isArray(body["sender"])) body["sender"] = {};
      body["sender"]["handle"] = d.sender_handle;
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
    if (d.metadata !== undefined && d.metadata !== null && d.metadata !== '') {
      body["metadata"] = d.metadata;
    }
    if (d.metadata_thread_ref !== undefined && d.metadata_thread_ref !== null && d.metadata_thread_ref !== '') {
      if (!body["metadata"] || typeof body["metadata"] !== 'object' || Array.isArray(body["metadata"])) body["metadata"] = {};
      body["metadata"]["thread_ref"] = d.metadata_thread_ref;
    }
    if (d.metadata_headers !== undefined && d.metadata_headers !== null && d.metadata_headers !== '') {
      if (!body["metadata"] || typeof body["metadata"] !== 'object' || Array.isArray(body["metadata"])) body["metadata"] = {};
      body["metadata"]["headers"] = d.metadata_headers;
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


