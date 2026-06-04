const { utils } = require('./utils');

module.exports = {
  async instantly_setting_update_updateenrichmentsettingsforresource(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/supersearch-enrichment/{resource_id}/settings";
    const resource_id = String(d.resource_id || '').trim();
    if (!resource_id) return { ok: false, error: 'resource_id requis.' };
    reqPath = reqPath.replace('{resource_id}', encodeURIComponent(resource_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.auto_update !== undefined && d.auto_update !== null && d.auto_update !== '') {
      body["auto_update"] = d.auto_update;
    }
    if (d.skip_rows_without_email !== undefined && d.skip_rows_without_email !== null && d.skip_rows_without_email !== '') {
      body["skip_rows_without_email"] = d.skip_rows_without_email;
    }
    if (d.is_evergreen !== undefined && d.is_evergreen !== null && d.is_evergreen !== '') {
      body["is_evergreen"] = d.is_evergreen;
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

