const { utils } = require('./utils');

module.exports = {
  async activecampaign_dealgroup_update_deal_updatepipeline(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/dealGroups/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.dealgroup_title !== undefined && d.dealgroup_title !== null && d.dealgroup_title !== "") {
          if (!body["dealgroup"] || typeof body["dealgroup"] !== 'object' || Array.isArray(body["dealgroup"])) body["dealgroup"] = {};
          body["dealgroup"]["title"] = d.dealgroup_title;
        }
    if (d.dealgroup_currency !== undefined && d.dealgroup_currency !== null && d.dealgroup_currency !== "") {
          if (!body["dealgroup"] || typeof body["dealgroup"] !== 'object' || Array.isArray(body["dealgroup"])) body["dealgroup"] = {};
          body["dealgroup"]["currency"] = d.dealgroup_currency;
        }
    if (d.dealgroup_allgroups !== undefined && d.dealgroup_allgroups !== null && d.dealgroup_allgroups !== "") {
          if (!body["dealgroup"] || typeof body["dealgroup"] !== 'object' || Array.isArray(body["dealgroup"])) body["dealgroup"] = {};
          body["dealgroup"]["allgroups"] = d.dealgroup_allgroups;
        }
    if (d.dealgroup_allusers !== undefined && d.dealgroup_allusers !== null && d.dealgroup_allusers !== "") {
          if (!body["dealgroup"] || typeof body["dealgroup"] !== 'object' || Array.isArray(body["dealgroup"])) body["dealgroup"] = {};
          body["dealgroup"]["allusers"] = d.dealgroup_allusers;
        }
    if (d.dealgroup_autoassign !== undefined && d.dealgroup_autoassign !== null && d.dealgroup_autoassign !== "") {
          if (!body["dealgroup"] || typeof body["dealgroup"] !== 'object' || Array.isArray(body["dealgroup"])) body["dealgroup"] = {};
          body["dealgroup"]["autoassign"] = d.dealgroup_autoassign;
        }
    if (d.dealgroup_users !== undefined && d.dealgroup_users !== null && d.dealgroup_users !== "") {
          if (!body["dealgroup"] || typeof body["dealgroup"] !== 'object' || Array.isArray(body["dealgroup"])) body["dealgroup"] = {};
          body["dealgroup"]["users"] = d.dealgroup_users;
        }
    if (d.dealgroup_groups !== undefined && d.dealgroup_groups !== null && d.dealgroup_groups !== "") {
          if (!body["dealgroup"] || typeof body["dealgroup"] !== 'object' || Array.isArray(body["dealgroup"])) body["dealgroup"] = {};
          body["dealgroup"]["groups"] = d.dealgroup_groups;
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
