const { utils } = require('./utils');

module.exports = {
  async instantly_count_leads_from_supersearch_search_countleadsfromsupersearch(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/supersearch-enrichment/count-leads-from-supersearch";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.search_filters !== undefined && d.search_filters !== null && d.search_filters !== '') {
      body["search_filters"] = d.search_filters;
    }
    if (d.search_filters_locations !== undefined && d.search_filters_locations !== null && d.search_filters_locations !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["locations"] = d.search_filters_locations;
    }
    if (d.search_filters_locations_include !== undefined && d.search_filters_locations_include !== null && d.search_filters_locations_include !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["locations"] || typeof body["search_filters"]["locations"] !== 'object' || Array.isArray(body["search_filters"]["locations"])) body["search_filters"]["locations"] = {};
      body["search_filters"]["locations"]["include"] = d.search_filters_locations_include;
    }
    if (d.search_filters_locations_exclude !== undefined && d.search_filters_locations_exclude !== null && d.search_filters_locations_exclude !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["locations"] || typeof body["search_filters"]["locations"] !== 'object' || Array.isArray(body["search_filters"]["locations"])) body["search_filters"]["locations"] = {};
      body["search_filters"]["locations"]["exclude"] = d.search_filters_locations_exclude;
    }
    if (d.search_filters_department !== undefined && d.search_filters_department !== null && d.search_filters_department !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["department"] = d.search_filters_department;
    }
    if (d.search_filters_level !== undefined && d.search_filters_level !== null && d.search_filters_level !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["level"] = d.search_filters_level;
    }
    if (d.search_filters_employeecount !== undefined && d.search_filters_employeecount !== null && d.search_filters_employeecount !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["employeecount"] = d.search_filters_employeecount;
    }
    if (d.search_filters_revenue !== undefined && d.search_filters_revenue !== null && d.search_filters_revenue !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["revenue"] = d.search_filters_revenue;
    }
    if (d.search_filters_news !== undefined && d.search_filters_news !== null && d.search_filters_news !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["news"] = d.search_filters_news;
    }
    if (d.search_filters_title !== undefined && d.search_filters_title !== null && d.search_filters_title !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["title"] = d.search_filters_title;
    }
    if (d.search_filters_title_include !== undefined && d.search_filters_title_include !== null && d.search_filters_title_include !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["title"] || typeof body["search_filters"]["title"] !== 'object' || Array.isArray(body["search_filters"]["title"])) body["search_filters"]["title"] = {};
      body["search_filters"]["title"]["include"] = d.search_filters_title_include;
    }
    if (d.search_filters_title_exclude !== undefined && d.search_filters_title_exclude !== null && d.search_filters_title_exclude !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["title"] || typeof body["search_filters"]["title"] !== 'object' || Array.isArray(body["search_filters"]["title"])) body["search_filters"]["title"] = {};
      body["search_filters"]["title"]["exclude"] = d.search_filters_title_exclude;
    }
    if (d.search_filters_name !== undefined && d.search_filters_name !== null && d.search_filters_name !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["name"] = d.search_filters_name;
    }
    if (d.search_filters_company_name !== undefined && d.search_filters_company_name !== null && d.search_filters_company_name !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["company_name"] = d.search_filters_company_name;
    }
    if (d.search_filters_company_name_include !== undefined && d.search_filters_company_name_include !== null && d.search_filters_company_name_include !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["company_name"] || typeof body["search_filters"]["company_name"] !== 'object' || Array.isArray(body["search_filters"]["company_name"])) body["search_filters"]["company_name"] = {};
      body["search_filters"]["company_name"]["include"] = d.search_filters_company_name_include;
    }
    if (d.search_filters_company_name_exclude !== undefined && d.search_filters_company_name_exclude !== null && d.search_filters_company_name_exclude !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["company_name"] || typeof body["search_filters"]["company_name"] !== 'object' || Array.isArray(body["search_filters"]["company_name"])) body["search_filters"]["company_name"] = {};
      body["search_filters"]["company_name"]["exclude"] = d.search_filters_company_name_exclude;
    }
    if (d.search_filters_look_alike !== undefined && d.search_filters_look_alike !== null && d.search_filters_look_alike !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["look_alike"] = d.search_filters_look_alike;
    }
    if (d.search_filters_keyword_filter !== undefined && d.search_filters_keyword_filter !== null && d.search_filters_keyword_filter !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["keyword_filter"] = d.search_filters_keyword_filter;
    }
    if (d.search_filters_keyword_filter_exclude !== undefined && d.search_filters_keyword_filter_exclude !== null && d.search_filters_keyword_filter_exclude !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["keyword_filter"] || typeof body["search_filters"]["keyword_filter"] !== 'object' || Array.isArray(body["search_filters"]["keyword_filter"])) body["search_filters"]["keyword_filter"] = {};
      body["search_filters"]["keyword_filter"]["exclude"] = d.search_filters_keyword_filter_exclude;
    }
    if (d.search_filters_keyword_filter_include !== undefined && d.search_filters_keyword_filter_include !== null && d.search_filters_keyword_filter_include !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["keyword_filter"] || typeof body["search_filters"]["keyword_filter"] !== 'object' || Array.isArray(body["search_filters"]["keyword_filter"])) body["search_filters"]["keyword_filter"] = {};
      body["search_filters"]["keyword_filter"]["include"] = d.search_filters_keyword_filter_include;
    }
    if (d.search_filters_industry !== undefined && d.search_filters_industry !== null && d.search_filters_industry !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["industry"] = d.search_filters_industry;
    }
    if (d.search_filters_industry_exclude !== undefined && d.search_filters_industry_exclude !== null && d.search_filters_industry_exclude !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["industry"] || typeof body["search_filters"]["industry"] !== 'object' || Array.isArray(body["search_filters"]["industry"])) body["search_filters"]["industry"] = {};
      body["search_filters"]["industry"]["exclude"] = d.search_filters_industry_exclude;
    }
    if (d.search_filters_industry_include !== undefined && d.search_filters_industry_include !== null && d.search_filters_industry_include !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["industry"] || typeof body["search_filters"]["industry"] !== 'object' || Array.isArray(body["search_filters"]["industry"])) body["search_filters"]["industry"] = {};
      body["search_filters"]["industry"]["include"] = d.search_filters_industry_include;
    }
    if (d.search_filters_subindustry !== undefined && d.search_filters_subindustry !== null && d.search_filters_subindustry !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["subindustry"] = d.search_filters_subindustry;
    }
    if (d.search_filters_subindustry_exclude !== undefined && d.search_filters_subindustry_exclude !== null && d.search_filters_subindustry_exclude !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["subindustry"] || typeof body["search_filters"]["subindustry"] !== 'object' || Array.isArray(body["search_filters"]["subindustry"])) body["search_filters"]["subindustry"] = {};
      body["search_filters"]["subindustry"]["exclude"] = d.search_filters_subindustry_exclude;
    }
    if (d.search_filters_subindustry_include !== undefined && d.search_filters_subindustry_include !== null && d.search_filters_subindustry_include !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      if (!body["search_filters"]["subindustry"] || typeof body["search_filters"]["subindustry"] !== 'object' || Array.isArray(body["search_filters"]["subindustry"])) body["search_filters"]["subindustry"] = {};
      body["search_filters"]["subindustry"]["include"] = d.search_filters_subindustry_include;
    }
    if (d.search_filters_domains !== undefined && d.search_filters_domains !== null && d.search_filters_domains !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["domains"] = d.search_filters_domains;
    }
    if (d.search_filters_funding_type !== undefined && d.search_filters_funding_type !== null && d.search_filters_funding_type !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["funding_type"] = d.search_filters_funding_type;
    }
    if (d.search_filters_signals !== undefined && d.search_filters_signals !== null && d.search_filters_signals !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["signals"] = d.search_filters_signals;
    }
    if (d.search_filters_skip_owned_leads !== undefined && d.search_filters_skip_owned_leads !== null && d.search_filters_skip_owned_leads !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["skip_owned_leads"] = d.search_filters_skip_owned_leads;
    }
    if (d.search_filters_show_one_lead_per_company !== undefined && d.search_filters_show_one_lead_per_company !== null && d.search_filters_show_one_lead_per_company !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["show_one_lead_per_company"] = d.search_filters_show_one_lead_per_company;
    }
    if (d.search_filters_location_mode !== undefined && d.search_filters_location_mode !== null && d.search_filters_location_mode !== '') {
      if (!body["search_filters"] || typeof body["search_filters"] !== 'object' || Array.isArray(body["search_filters"])) body["search_filters"] = {};
      body["search_filters"]["location_mode"] = d.search_filters_location_mode;
    }
    if (d.skip_owned_leads !== undefined && d.skip_owned_leads !== null && d.skip_owned_leads !== '') {
      body["skip_owned_leads"] = d.skip_owned_leads;
    }
    if (d.show_one_lead_per_company !== undefined && d.show_one_lead_per_company !== null && d.show_one_lead_per_company !== '') {
      body["show_one_lead_per_company"] = d.show_one_lead_per_company;
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

