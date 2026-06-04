const { utils } = require('./utils');

module.exports = {
  async front_draft_create_create_draft_reply(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/conversations/{conversation_id}/drafts";
    const conversation_id = String(d.conversation_id || '').trim();
    if (!conversation_id) return { ok: false, error: 'conversation_id requis.' };
    reqPath = reqPath.replace('{conversation_id}', encodeURIComponent(conversation_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.author_id !== undefined && d.author_id !== null && d.author_id !== '') {
      body["author_id"] = d.author_id;
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
    if (d.quote_body !== undefined && d.quote_body !== null && d.quote_body !== '') {
      body["quote_body"] = d.quote_body;
    }
    if (d.attachments !== undefined && d.attachments !== null && d.attachments !== '') {
      body["attachments"] = d.attachments;
    }
    if (d.mode !== undefined && d.mode !== null && d.mode !== '') {
      body["mode"] = d.mode;
    }
    if (d.signature_id !== undefined && d.signature_id !== null && d.signature_id !== '') {
      body["signature_id"] = d.signature_id;
    }
    if (d.should_add_default_signature !== undefined && d.should_add_default_signature !== null && d.should_add_default_signature !== '') {
      body["should_add_default_signature"] = d.should_add_default_signature;
    }
    if (d.channel_id !== undefined && d.channel_id !== null && d.channel_id !== '') {
      body["channel_id"] = d.channel_id;
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


