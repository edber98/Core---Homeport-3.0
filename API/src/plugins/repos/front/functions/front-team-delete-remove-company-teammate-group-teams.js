const { utils } = require('./utils');

module.exports = {
  async front_team_delete_remove_company_teammate_group_teams(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teammate_groups/{teammate_group_id}/teams";
    const teammate_group_id = String(d.teammate_group_id || '').trim();
    if (!teammate_group_id) return { ok: false, error: 'teammate_group_id requis.' };
    reqPath = reqPath.replace('{teammate_group_id}', encodeURIComponent(teammate_group_id));

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
