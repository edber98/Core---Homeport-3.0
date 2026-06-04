const { utils } = require('./utils');

module.exports = {
  async activecampaign_groupmember_update_field_updatecustomfieldgroup(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/groupMembers/{groupId}";
    const groupid = String(d.groupid || '').trim();
    if (!groupid) return { ok: false, error: 'groupid requis.' };
    reqPath = reqPath.replace('{groupid}', encodeURIComponent(groupid));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.rel_id !== undefined && d.rel_id !== null && d.rel_id !== "") {
          body["rel_id"] = d.rel_id;
        }
    if (d.ordernum !== undefined && d.ordernum !== null && d.ordernum !== "") {
          body["ordernum"] = d.ordernum;
        }
    if (d.group_id !== undefined && d.group_id !== null && d.group_id !== "") {
          body["group_id"] = d.group_id;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
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
