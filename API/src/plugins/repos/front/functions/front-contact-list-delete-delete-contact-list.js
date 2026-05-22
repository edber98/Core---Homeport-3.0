const { utils } = require('./utils');

module.exports = {
  async front_contact_list_delete_delete_contact_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contact_lists/{contact_list_id}";
    const contact_list_id = String(d.contact_list_id || '').trim();
    if (!contact_list_id) return { ok: false, error: 'contact_list_id requis.' };
    reqPath = reqPath.replace('{contact_list_id}', encodeURIComponent(contact_list_id));

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
