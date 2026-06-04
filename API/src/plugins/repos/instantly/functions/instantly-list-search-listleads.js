const { utils } = require('./utils');

module.exports = {
  async instantly_list_search_listleads(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/leads/list";
    

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
    if (d.ids !== undefined && d.ids !== null && d.ids !== '') {
      body["ids"] = d.ids;
    }
    if (d.queries !== undefined && d.queries !== null && d.queries !== '') {
      body["queries"] = d.queries;
    }
    if (d.excluded_ids !== undefined && d.excluded_ids !== null && d.excluded_ids !== '') {
      body["excluded_ids"] = d.excluded_ids;
    }
    if (d.contacts !== undefined && d.contacts !== null && d.contacts !== '') {
      body["contacts"] = d.contacts;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.starting_after !== undefined && d.starting_after !== null && d.starting_after !== '') {
      body["starting_after"] = d.starting_after;
    }
    if (d.organization_user_ids !== undefined && d.organization_user_ids !== null && d.organization_user_ids !== '') {
      body["organization_user_ids"] = d.organization_user_ids;
    }
    if (d.smart_view_id !== undefined && d.smart_view_id !== null && d.smart_view_id !== '') {
      body["smart_view_id"] = d.smart_view_id;
    }
    if (d.is_website_visitor !== undefined && d.is_website_visitor !== null && d.is_website_visitor !== '') {
      body["is_website_visitor"] = d.is_website_visitor;
    }
    if (d.distinct_contacts !== undefined && d.distinct_contacts !== null && d.distinct_contacts !== '') {
      body["distinct_contacts"] = d.distinct_contacts;
    }
    if (d.enrichment_status !== undefined && d.enrichment_status !== null && d.enrichment_status !== '') {
      body["enrichment_status"] = d.enrichment_status;
    }
    if (d.esg_code !== undefined && d.esg_code !== null && d.esg_code !== '') {
      body["esg_code"] = d.esg_code;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };
  }
};

