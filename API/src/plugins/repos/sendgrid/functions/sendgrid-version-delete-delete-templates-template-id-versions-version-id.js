const { utils } = require('./utils');

module.exports = {
  async sendgrid_version_delete_delete_templates_template_id_versions_version_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/templates/{template_id}/versions/{version_id}";
    const template_id = String(d.template_id || '').trim();
    if (!template_id) return { ok: false, error: 'template_id requis.' };
    reqPath = reqPath.replace('{template_id}', encodeURIComponent(template_id));
    const version_id = String(d.version_id || '').trim();
    if (!version_id) return { ok: false, error: 'version_id requis.' };
    reqPath = reqPath.replace('{version_id}', encodeURIComponent(version_id));

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
