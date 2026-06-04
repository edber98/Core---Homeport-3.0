const { utils } = require('./utils');

module.exports = {
  async front_reminder_update_update_conversation_reminders(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/conversations/{conversation_id}/reminders";
    const conversation_id = String(d.conversation_id || '').trim();
    if (!conversation_id) return { ok: false, error: 'conversation_id requis.' };
    reqPath = reqPath.replace('{conversation_id}', encodeURIComponent(conversation_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.teammate_id !== undefined && d.teammate_id !== null && d.teammate_id !== '') {
      body["teammate_id"] = d.teammate_id;
    }
    if (d.scheduled_at !== undefined && d.scheduled_at !== null && d.scheduled_at !== '') {
      body["scheduled_at"] = d.scheduled_at;
    }
    if (d.status_id !== undefined && d.status_id !== null && d.status_id !== '') {
      body["status_id"] = d.status_id;
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

