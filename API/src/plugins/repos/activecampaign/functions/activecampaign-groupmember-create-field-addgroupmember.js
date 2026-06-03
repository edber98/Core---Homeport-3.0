const { utils } = require('./utils');

module.exports = {
  async activecampaign_groupmember_create_field_addgroupmember(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/groupMembers";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.groupmember_rel_id !== undefined && d.groupmember_rel_id !== null && d.groupmember_rel_id !== "") {
          if (!body["groupmember"] || typeof body["groupmember"] !== 'object' || Array.isArray(body["groupmember"])) body["groupmember"] = {};
          body["groupmember"]["rel_id"] = d.groupmember_rel_id;
        }
    if (d.groupmember_ordernum !== undefined && d.groupmember_ordernum !== null && d.groupmember_ordernum !== "") {
          if (!body["groupmember"] || typeof body["groupmember"] !== 'object' || Array.isArray(body["groupmember"])) body["groupmember"] = {};
          body["groupmember"]["ordernum"] = d.groupmember_ordernum;
        }
    if (d.groupmember_group_id !== undefined && d.groupmember_group_id !== null && d.groupmember_group_id !== "") {
          if (!body["groupmember"] || typeof body["groupmember"] !== 'object' || Array.isArray(body["groupmember"])) body["groupmember"] = {};
          body["groupmember"]["group_id"] = d.groupmember_group_id;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body: requestBody });
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
