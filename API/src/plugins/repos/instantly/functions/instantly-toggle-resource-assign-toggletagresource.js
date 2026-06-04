const { utils } = require('./utils');

module.exports = {
  async instantly_toggle_resource_assign_toggletagresource(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/custom-tags/toggle-resource";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.tag_ids !== undefined && d.tag_ids !== null && d.tag_ids !== '') {
      body["tag_ids"] = d.tag_ids;
    }
    if (d.resource_type !== undefined && d.resource_type !== null && d.resource_type !== '') {
      body["resource_type"] = d.resource_type;
    }
    if (d.resource_ids !== undefined && d.resource_ids !== null && d.resource_ids !== '') {
      body["resource_ids"] = d.resource_ids;
    }
    if (d.excluded_resource_ids !== undefined && d.excluded_resource_ids !== null && d.excluded_resource_ids !== '') {
      body["excluded_resource_ids"] = d.excluded_resource_ids;
    }
    if (d.assign !== undefined && d.assign !== null && d.assign !== '') {
      body["assign"] = d.assign;
    }
    if (d.selected_all !== undefined && d.selected_all !== null && d.selected_all !== '') {
      body["selected_all"] = d.selected_all;
    }
    if (d.filter !== undefined && d.filter !== null && d.filter !== '') {
      body["filter"] = d.filter;
    }
    if (d.filter_tag_id !== undefined && d.filter_tag_id !== null && d.filter_tag_id !== '') {
      if (!body["filter"] || typeof body["filter"] !== 'object' || Array.isArray(body["filter"])) body["filter"] = {};
      body["filter"]["tag_id"] = d.filter_tag_id;
    }
    if (d.filter_tag_ids !== undefined && d.filter_tag_ids !== null && d.filter_tag_ids !== '') {
      if (!body["filter"] || typeof body["filter"] !== 'object' || Array.isArray(body["filter"])) body["filter"] = {};
      body["filter"]["tag_ids"] = d.filter_tag_ids;
    }
    if (d.filter_tag_ids_all !== undefined && d.filter_tag_ids_all !== null && d.filter_tag_ids_all !== '') {
      if (!body["filter"] || typeof body["filter"] !== 'object' || Array.isArray(body["filter"])) body["filter"] = {};
      body["filter"]["tag_ids_all"] = d.filter_tag_ids_all;
    }
    if (d.filter_filter !== undefined && d.filter_filter !== null && d.filter_filter !== '') {
      if (!body["filter"] || typeof body["filter"] !== 'object' || Array.isArray(body["filter"])) body["filter"] = {};
      body["filter"]["filter"] = d.filter_filter;
    }
    if (d.filter_search !== undefined && d.filter_search !== null && d.filter_search !== '') {
      if (!body["filter"] || typeof body["filter"] !== 'object' || Array.isArray(body["filter"])) body["filter"] = {};
      body["filter"]["search"] = d.filter_search;
    }
    if (d.search !== undefined && d.search !== null && d.search !== '') {
      body["search"] = d.search;
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

