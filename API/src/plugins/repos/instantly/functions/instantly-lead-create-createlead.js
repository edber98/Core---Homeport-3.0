const { utils } = require('./utils');

module.exports = {
  async instantly_lead_create_createlead(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/leads";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.campaign !== undefined && d.campaign !== null && d.campaign !== '') {
      body["campaign"] = d.campaign;
    }
    if (d.email !== undefined && d.email !== null && d.email !== '') {
      body["email"] = d.email;
    }
    if (d.personalization !== undefined && d.personalization !== null && d.personalization !== '') {
      body["personalization"] = d.personalization;
    }
    if (d.website !== undefined && d.website !== null && d.website !== '') {
      body["website"] = d.website;
    }
    if (d.last_name !== undefined && d.last_name !== null && d.last_name !== '') {
      body["last_name"] = d.last_name;
    }
    if (d.first_name !== undefined && d.first_name !== null && d.first_name !== '') {
      body["first_name"] = d.first_name;
    }
    if (d.company_name !== undefined && d.company_name !== null && d.company_name !== '') {
      body["company_name"] = d.company_name;
    }
    if (d.job_title !== undefined && d.job_title !== null && d.job_title !== '') {
      body["job_title"] = d.job_title;
    }
    if (d.phone !== undefined && d.phone !== null && d.phone !== '') {
      body["phone"] = d.phone;
    }
    if (d.lt_interest_status !== undefined && d.lt_interest_status !== null && d.lt_interest_status !== '') {
      body["lt_interest_status"] = d.lt_interest_status;
    }
    if (d.pl_value_lead !== undefined && d.pl_value_lead !== null && d.pl_value_lead !== '') {
      body["pl_value_lead"] = d.pl_value_lead;
    }
    if (d.list_id !== undefined && d.list_id !== null && d.list_id !== '') {
      body["list_id"] = d.list_id;
    }
    if (d.assigned_to !== undefined && d.assigned_to !== null && d.assigned_to !== '') {
      body["assigned_to"] = d.assigned_to;
    }
    if (d.skip_if_in_workspace !== undefined && d.skip_if_in_workspace !== null && d.skip_if_in_workspace !== '') {
      body["skip_if_in_workspace"] = d.skip_if_in_workspace;
    }
    if (d.skip_if_in_campaign !== undefined && d.skip_if_in_campaign !== null && d.skip_if_in_campaign !== '') {
      body["skip_if_in_campaign"] = d.skip_if_in_campaign;
    }
    if (d.skip_if_in_list !== undefined && d.skip_if_in_list !== null && d.skip_if_in_list !== '') {
      body["skip_if_in_list"] = d.skip_if_in_list;
    }
    if (d.blocklist_id !== undefined && d.blocklist_id !== null && d.blocklist_id !== '') {
      body["blocklist_id"] = d.blocklist_id;
    }
    if (d.verify_leads_for_lead_finder !== undefined && d.verify_leads_for_lead_finder !== null && d.verify_leads_for_lead_finder !== '') {
      body["verify_leads_for_lead_finder"] = d.verify_leads_for_lead_finder;
    }
    if (d.verify_leads_on_import !== undefined && d.verify_leads_on_import !== null && d.verify_leads_on_import !== '') {
      body["verify_leads_on_import"] = d.verify_leads_on_import;
    }
    if (d.custom_variables !== undefined && d.custom_variables !== null && d.custom_variables !== '') {
      body["custom_variables"] = d.custom_variables;
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

