const { utils } = require('./utils');

module.exports = {
  async instantly_bulk_assign_assign_bulkassignleads(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/leads/bulk-assign";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.search !== undefined && d.search !== null && d.search !== '') {
      body["search"] = d.search;
    }
    if (d.filter !== undefined && d.filter !== null && d.filter !== '') {
      body["filter"] = d.filter;
    }
    if (d.campaign !== undefined && d.campaign !== null && d.campaign !== '') {
      body["campaign"] = d.campaign;
    }
    if (d.list_id !== undefined && d.list_id !== null && d.list_id !== '') {
      body["list_id"] = d.list_id;
    }
    if (d.in_campaign !== undefined && d.in_campaign !== null && d.in_campaign !== '') {
      body["in_campaign"] = d.in_campaign;
    }
    if (d.in_list !== undefined && d.in_list !== null && d.in_list !== '') {
      body["in_list"] = d.in_list;
    }
    if (d.organization_user_ids !== undefined && d.organization_user_ids !== null && d.organization_user_ids !== '') {
      body["organization_user_ids"] = d.organization_user_ids;
    }
    if (d.smart_view_id !== undefined && d.smart_view_id !== null && d.smart_view_id !== '') {
      body["smart_view_id"] = d.smart_view_id;
    }
    if (d.ids !== undefined && d.ids !== null && d.ids !== '') {
      body["ids"] = d.ids;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.queries !== undefined && d.queries !== null && d.queries !== '') {
      body["queries"] = d.queries;
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

