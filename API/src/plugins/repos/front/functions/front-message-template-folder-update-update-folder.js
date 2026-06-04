const { utils } = require('./utils');

module.exports = {
  async front_message_template_folder_update_update_folder(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/message_template_folders/{message_template_folder_id}";
    const message_template_folder_id = String(d.message_template_folder_id || '').trim();
    if (!message_template_folder_id) return { ok: false, error: 'message_template_folder_id requis.' };
    reqPath = reqPath.replace('{message_template_folder_id}', encodeURIComponent(message_template_folder_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.parent_folder_id !== undefined && d.parent_folder_id !== null && d.parent_folder_id !== '') {
      body["parent_folder_id"] = d.parent_folder_id;
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

