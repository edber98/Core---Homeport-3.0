const { utils } = require('./utils');

module.exports = {
  async instantly_lead_move_moveleads(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/leads/move";
    

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
    if (d.to_campaign_id !== undefined && d.to_campaign_id !== null && d.to_campaign_id !== '') {
      body["to_campaign_id"] = d.to_campaign_id;
    }
    if (d.to_list_id !== undefined && d.to_list_id !== null && d.to_list_id !== '') {
      body["to_list_id"] = d.to_list_id;
    }
    if (d.ignore_resource_filter_clauses !== undefined && d.ignore_resource_filter_clauses !== null && d.ignore_resource_filter_clauses !== '') {
      body["ignore_resource_filter_clauses"] = d.ignore_resource_filter_clauses;
    }
    if (d.check_duplicates_in_campaigns !== undefined && d.check_duplicates_in_campaigns !== null && d.check_duplicates_in_campaigns !== '') {
      body["check_duplicates_in_campaigns"] = d.check_duplicates_in_campaigns;
    }
    if (d.skip_leads_in_verification !== undefined && d.skip_leads_in_verification !== null && d.skip_leads_in_verification !== '') {
      body["skip_leads_in_verification"] = d.skip_leads_in_verification;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.assigned_to !== undefined && d.assigned_to !== null && d.assigned_to !== '') {
      body["assigned_to"] = d.assigned_to;
    }
    if (d.esp_code !== undefined && d.esp_code !== null && d.esp_code !== '') {
      body["esp_code"] = d.esp_code;
    }
    if (d.esg_code !== undefined && d.esg_code !== null && d.esg_code !== '') {
      body["esg_code"] = d.esg_code;
    }
    if (d.copy_leads !== undefined && d.copy_leads !== null && d.copy_leads !== '') {
      body["copy_leads"] = d.copy_leads;
    }
    if (d.check_duplicates !== undefined && d.check_duplicates !== null && d.check_duplicates !== '') {
      body["check_duplicates"] = d.check_duplicates;
    }
    if (d.reset_interest_status !== undefined && d.reset_interest_status !== null && d.reset_interest_status !== '') {
      body["reset_interest_status"] = d.reset_interest_status;
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

