const { utils } = require('./utils');

module.exports = {
  async sendgrid_suppression_delete_delete_asm_groups_group_id_suppressions_email(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/asm/groups/{group_id}/suppressions/{email}";
    const group_id = String(d.group_id || '').trim();
    if (!group_id) return { ok: false, error: 'group_id requis.' };
    reqPath = reqPath.replace('{group_id}', encodeURIComponent(group_id));
    const email = String(d.email || '').trim();
    if (!email) return { ok: false, error: 'email requis.' };
    reqPath = reqPath.replace('{email}', encodeURIComponent(email));

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
