const { utils } = require('./utils');

module.exports = {
  async front_message_template_create_create_child_template(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/message_template_folders/{message_template_folder_id}/message_templates";
    const message_template_folder_id = String(d.message_template_folder_id || '').trim();
    if (!message_template_folder_id) return { ok: false, error: 'message_template_folder_id requis.' };
    reqPath = reqPath.replace('{message_template_folder_id}', encodeURIComponent(message_template_folder_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      body["body"] = d.body;
    }
    if (d.inbox_ids !== undefined && d.inbox_ids !== null && d.inbox_ids !== '') {
      body["inbox_ids"] = d.inbox_ids;
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


