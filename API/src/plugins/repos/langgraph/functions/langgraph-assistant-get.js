const { utils } = require('./utils');

module.exports = {
  async langgraph_assistant_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/assistants/{assistant_id}";
    const assistant_id = String(d.assistant_id || '').trim();
    if (!assistant_id) return { ok: false, error: 'assistant_id requis.' };
    reqPath = reqPath.replace('{assistant_id}', encodeURIComponent(assistant_id));

    const query = {};
    if (d.code !== undefined && d.code !== null && d.code !== '') query["code"] = d.code;
    if (d.state !== undefined && d.state !== null && d.state !== '') query["state"] = d.state;
    if (d.setup_action !== undefined && d.setup_action !== null && d.setup_action !== '') query["setup_action"] = d.setup_action;
    if (d.installation_id !== undefined && d.installation_id !== null && d.installation_id !== '') query["installation_id"] = d.installation_id;
    if (d.error !== undefined && d.error !== null && d.error !== '') query["error"] = d.error;
    if (d.error_description !== undefined && d.error_description !== null && d.error_description !== '') query["error_description"] = d.error_description;

    const headers = {};

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body, headers });
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

