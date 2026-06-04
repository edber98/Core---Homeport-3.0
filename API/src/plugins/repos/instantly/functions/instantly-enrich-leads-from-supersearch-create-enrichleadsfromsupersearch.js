const { utils } = require('./utils');

module.exports = {
  async instantly_enrich_leads_from_supersearch_create_enrichleadsfromsupersearch(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/supersearch-enrichment/enrich-leads-from-supersearch";
    

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
    if (d.search_name !== undefined && d.search_name !== null && d.search_name !== '') {
      body["search_name"] = d.search_name;
    }
    if (d.work_email_enrichment !== undefined && d.work_email_enrichment !== null && d.work_email_enrichment !== '') {
      body["work_email_enrichment"] = d.work_email_enrichment;
    }
    if (d.fully_enriched_profile !== undefined && d.fully_enriched_profile !== null && d.fully_enriched_profile !== '') {
      body["fully_enriched_profile"] = d.fully_enriched_profile;
    }
    if (d.custom_flow !== undefined && d.custom_flow !== null && d.custom_flow !== '') {
      body["custom_flow"] = d.custom_flow;
    }
    if (d.signal_enrichment !== undefined && d.signal_enrichment !== null && d.signal_enrichment !== '') {
      body["signal_enrichment"] = d.signal_enrichment;
    }
    if (d.resource_id !== undefined && d.resource_id !== null && d.resource_id !== '') {
      body["resource_id"] = d.resource_id;
    }
    if (d.auto_update !== undefined && d.auto_update !== null && d.auto_update !== '') {
      body["auto_update"] = d.auto_update;
    }
    if (d.evergreen !== undefined && d.evergreen !== null && d.evergreen !== '') {
      body["evergreen"] = d.evergreen;
    }
    if (d.evergreen_leads_to_add !== undefined && d.evergreen_leads_to_add !== null && d.evergreen_leads_to_add !== '') {
      if (!body["evergreen"] || typeof body["evergreen"] !== 'object' || Array.isArray(body["evergreen"])) body["evergreen"] = {};
      body["evergreen"]["leads_to_add"] = d.evergreen_leads_to_add;
    }
    if (d.evergreen_frequency !== undefined && d.evergreen_frequency !== null && d.evergreen_frequency !== '') {
      if (!body["evergreen"] || typeof body["evergreen"] !== 'object' || Array.isArray(body["evergreen"])) body["evergreen"] = {};
      body["evergreen"]["frequency"] = d.evergreen_frequency;
    }
    if (d.skip_rows_without_email !== undefined && d.skip_rows_without_email !== null && d.skip_rows_without_email !== '') {
      body["skip_rows_without_email"] = d.skip_rows_without_email;
    }
    if (d.list_name !== undefined && d.list_name !== null && d.list_name !== '') {
      body["list_name"] = d.list_name;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.ai_enrichment !== undefined && d.ai_enrichment !== null && d.ai_enrichment !== '') {
      body["ai_enrichment"] = d.ai_enrichment;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
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

