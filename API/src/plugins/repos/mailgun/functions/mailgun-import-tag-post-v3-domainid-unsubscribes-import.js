const { utils } = require('./utils');

module.exports = {
  async mailgun_import_tag_post_v3_domainid_unsubscribes_import(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/{domain_name}/unsubscribes/import";
    const domain_name = String(d.domain_name || '').trim();
    if (!domain_name) return { ok: false, error: 'domain_name requis.' };
    reqPath = reqPath.replace('{domain_name}', encodeURIComponent(domain_name));

    const query = {};

    const headers = {};
    if (d.content_type !== undefined && d.content_type !== null && d.content_type !== '') headers["Content-Type"] = String(d.content_type);

    const body = {};
    if (d.file !== undefined && d.file !== null && d.file !== '') {
      body["file"] = d.file;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

