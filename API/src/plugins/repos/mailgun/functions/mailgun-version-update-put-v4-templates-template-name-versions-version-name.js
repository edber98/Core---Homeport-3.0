const { utils } = require('./utils');

module.exports = {
  async mailgun_version_update_put_v4_templates_template_name_versions_version_name(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v4/templates/{template_name}/versions/{version_name}";
    const template_name = String(d.template_name || '').trim();
    if (!template_name) return { ok: false, error: 'template_name requis.' };
    reqPath = reqPath.replace('{template_name}', encodeURIComponent(template_name));
    const version_name = String(d.version_name || '').trim();
    if (!version_name) return { ok: false, error: 'version_name requis.' };
    reqPath = reqPath.replace('{version_name}', encodeURIComponent(version_name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.template !== undefined && d.template !== null && d.template !== '') {
      body["template"] = d.template;
    }
    if (d.comment !== undefined && d.comment !== null && d.comment !== '') {
      body["comment"] = d.comment;
    }
    if (d.active !== undefined && d.active !== null && d.active !== '') {
      body["active"] = d.active;
    }
    if (d.headers !== undefined && d.headers !== null && d.headers !== '') {
      body["headers"] = d.headers;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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


