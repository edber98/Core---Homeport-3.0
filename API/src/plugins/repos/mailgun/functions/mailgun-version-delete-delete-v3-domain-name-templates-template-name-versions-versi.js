const { utils } = require('./utils');

module.exports = {
  async mailgun_version_delete_delete_v3_domain_name_templates_template_name_versions_versi(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/{domain_name}/templates/{template_name}/versions/{version_name}";
    const domain_name = String(d.domain_name || '').trim();
    if (!domain_name) return { ok: false, error: 'domain_name requis.' };
    reqPath = reqPath.replace('{domain_name}', encodeURIComponent(domain_name));
    const template_name = String(d.template_name || '').trim();
    if (!template_name) return { ok: false, error: 'template_name requis.' };
    reqPath = reqPath.replace('{template_name}', encodeURIComponent(template_name));
    const version_name = String(d.version_name || '').trim();
    if (!version_name) return { ok: false, error: 'version_name requis.' };
    reqPath = reqPath.replace('{version_name}', encodeURIComponent(version_name));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
