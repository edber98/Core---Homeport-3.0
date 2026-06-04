const { utils } = require('./utils');

module.exports = {
  async front_conversation_update_update_conversation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/conversations/{conversation_id}";
    const conversation_id = String(d.conversation_id || '').trim();
    if (!conversation_id) return { ok: false, error: 'conversation_id requis.' };
    reqPath = reqPath.replace('{conversation_id}', encodeURIComponent(conversation_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.assignee_id !== undefined && d.assignee_id !== null && d.assignee_id !== '') {
      body["assignee_id"] = d.assignee_id;
    }
    if (d.inbox_id !== undefined && d.inbox_id !== null && d.inbox_id !== '') {
      body["inbox_id"] = d.inbox_id;
    }
    if (d.status !== undefined && d.status !== null && d.status !== '') {
      body["status"] = d.status;
    }
    if (d.status_id !== undefined && d.status_id !== null && d.status_id !== '') {
      body["status_id"] = d.status_id;
    }
    if (d.tag_ids !== undefined && d.tag_ids !== null && d.tag_ids !== '') {
      body["tag_ids"] = d.tag_ids;
    }
    if (d.custom_fields !== undefined && d.custom_fields !== null && d.custom_fields !== '') {
      body["custom_fields"] = d.custom_fields;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
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

