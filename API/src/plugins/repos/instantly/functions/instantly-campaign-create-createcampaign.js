const { utils } = require('./utils');

module.exports = {
  async instantly_campaign_create_createcampaign(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/campaigns";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.pl_value !== undefined && d.pl_value !== null && d.pl_value !== '') {
      body["pl_value"] = d.pl_value;
    }
    if (d.is_evergreen !== undefined && d.is_evergreen !== null && d.is_evergreen !== '') {
      body["is_evergreen"] = d.is_evergreen;
    }
    if (d.campaign_schedule !== undefined && d.campaign_schedule !== null && d.campaign_schedule !== '') {
      body["campaign_schedule"] = d.campaign_schedule;
    }
    if (d.campaign_schedule_start_date !== undefined && d.campaign_schedule_start_date !== null && d.campaign_schedule_start_date !== '') {
      if (!body["campaign_schedule"] || typeof body["campaign_schedule"] !== 'object' || Array.isArray(body["campaign_schedule"])) body["campaign_schedule"] = {};
      body["campaign_schedule"]["start_date"] = d.campaign_schedule_start_date;
    }
    if (d.campaign_schedule_end_date !== undefined && d.campaign_schedule_end_date !== null && d.campaign_schedule_end_date !== '') {
      if (!body["campaign_schedule"] || typeof body["campaign_schedule"] !== 'object' || Array.isArray(body["campaign_schedule"])) body["campaign_schedule"] = {};
      body["campaign_schedule"]["end_date"] = d.campaign_schedule_end_date;
    }
    if (d.campaign_schedule_schedules !== undefined && d.campaign_schedule_schedules !== null && d.campaign_schedule_schedules !== '') {
      if (!body["campaign_schedule"] || typeof body["campaign_schedule"] !== 'object' || Array.isArray(body["campaign_schedule"])) body["campaign_schedule"] = {};
      body["campaign_schedule"]["schedules"] = d.campaign_schedule_schedules;
    }
    if (d.sequences !== undefined && d.sequences !== null && d.sequences !== '') {
      body["sequences"] = d.sequences;
    }
    if (d.email_gap !== undefined && d.email_gap !== null && d.email_gap !== '') {
      body["email_gap"] = d.email_gap;
    }
    if (d.random_wait_max !== undefined && d.random_wait_max !== null && d.random_wait_max !== '') {
      body["random_wait_max"] = d.random_wait_max;
    }
    if (d.text_only !== undefined && d.text_only !== null && d.text_only !== '') {
      body["text_only"] = d.text_only;
    }
    if (d.first_email_text_only !== undefined && d.first_email_text_only !== null && d.first_email_text_only !== '') {
      body["first_email_text_only"] = d.first_email_text_only;
    }
    if (d.email_list !== undefined && d.email_list !== null && d.email_list !== '') {
      body["email_list"] = d.email_list;
    }
    if (d.daily_limit !== undefined && d.daily_limit !== null && d.daily_limit !== '') {
      body["daily_limit"] = d.daily_limit;
    }
    if (d.stop_on_reply !== undefined && d.stop_on_reply !== null && d.stop_on_reply !== '') {
      body["stop_on_reply"] = d.stop_on_reply;
    }
    if (d.email_tag_list !== undefined && d.email_tag_list !== null && d.email_tag_list !== '') {
      body["email_tag_list"] = d.email_tag_list;
    }
    if (d.link_tracking !== undefined && d.link_tracking !== null && d.link_tracking !== '') {
      body["link_tracking"] = d.link_tracking;
    }
    if (d.open_tracking !== undefined && d.open_tracking !== null && d.open_tracking !== '') {
      body["open_tracking"] = d.open_tracking;
    }
    if (d.stop_on_auto_reply !== undefined && d.stop_on_auto_reply !== null && d.stop_on_auto_reply !== '') {
      body["stop_on_auto_reply"] = d.stop_on_auto_reply;
    }
    if (d.daily_max_leads !== undefined && d.daily_max_leads !== null && d.daily_max_leads !== '') {
      body["daily_max_leads"] = d.daily_max_leads;
    }
    if (d.prioritize_new_leads !== undefined && d.prioritize_new_leads !== null && d.prioritize_new_leads !== '') {
      body["prioritize_new_leads"] = d.prioritize_new_leads;
    }
    if (d.auto_variant_select !== undefined && d.auto_variant_select !== null && d.auto_variant_select !== '') {
      body["auto_variant_select"] = d.auto_variant_select;
    }
    if (d.auto_variant_select_trigger !== undefined && d.auto_variant_select_trigger !== null && d.auto_variant_select_trigger !== '') {
      if (!body["auto_variant_select"] || typeof body["auto_variant_select"] !== 'object' || Array.isArray(body["auto_variant_select"])) body["auto_variant_select"] = {};
      body["auto_variant_select"]["trigger"] = d.auto_variant_select_trigger;
    }
    if (d.match_lead_esp !== undefined && d.match_lead_esp !== null && d.match_lead_esp !== '') {
      body["match_lead_esp"] = d.match_lead_esp;
    }
    if (d.stop_for_company !== undefined && d.stop_for_company !== null && d.stop_for_company !== '') {
      body["stop_for_company"] = d.stop_for_company;
    }
    if (d.insert_unsubscribe_header !== undefined && d.insert_unsubscribe_header !== null && d.insert_unsubscribe_header !== '') {
      body["insert_unsubscribe_header"] = d.insert_unsubscribe_header;
    }
    if (d.allow_risky_contacts !== undefined && d.allow_risky_contacts !== null && d.allow_risky_contacts !== '') {
      body["allow_risky_contacts"] = d.allow_risky_contacts;
    }
    if (d.disable_bounce_protect !== undefined && d.disable_bounce_protect !== null && d.disable_bounce_protect !== '') {
      body["disable_bounce_protect"] = d.disable_bounce_protect;
    }
    if (d.limit_emails_per_company_override !== undefined && d.limit_emails_per_company_override !== null && d.limit_emails_per_company_override !== '') {
      body["limit_emails_per_company_override"] = d.limit_emails_per_company_override;
    }
    if (d.limit_emails_per_company_override_mode !== undefined && d.limit_emails_per_company_override_mode !== null && d.limit_emails_per_company_override_mode !== '') {
      if (!body["limit_emails_per_company_override"] || typeof body["limit_emails_per_company_override"] !== 'object' || Array.isArray(body["limit_emails_per_company_override"])) body["limit_emails_per_company_override"] = {};
      body["limit_emails_per_company_override"]["mode"] = d.limit_emails_per_company_override_mode;
    }
    if (d.limit_emails_per_company_override_daily_limit !== undefined && d.limit_emails_per_company_override_daily_limit !== null && d.limit_emails_per_company_override_daily_limit !== '') {
      if (!body["limit_emails_per_company_override"] || typeof body["limit_emails_per_company_override"] !== 'object' || Array.isArray(body["limit_emails_per_company_override"])) body["limit_emails_per_company_override"] = {};
      body["limit_emails_per_company_override"]["daily_limit"] = d.limit_emails_per_company_override_daily_limit;
    }
    if (d.limit_emails_per_company_override_scope !== undefined && d.limit_emails_per_company_override_scope !== null && d.limit_emails_per_company_override_scope !== '') {
      if (!body["limit_emails_per_company_override"] || typeof body["limit_emails_per_company_override"] !== 'object' || Array.isArray(body["limit_emails_per_company_override"])) body["limit_emails_per_company_override"] = {};
      body["limit_emails_per_company_override"]["scope"] = d.limit_emails_per_company_override_scope;
    }
    if (d.cc_list !== undefined && d.cc_list !== null && d.cc_list !== '') {
      body["cc_list"] = d.cc_list;
    }
    if (d.bcc_list !== undefined && d.bcc_list !== null && d.bcc_list !== '') {
      body["bcc_list"] = d.bcc_list;
    }
    if (d.owned_by !== undefined && d.owned_by !== null && d.owned_by !== '') {
      body["owned_by"] = d.owned_by;
    }
    if (d.ai_sdr_id !== undefined && d.ai_sdr_id !== null && d.ai_sdr_id !== '') {
      body["ai_sdr_id"] = d.ai_sdr_id;
    }
    if (d.provider_routing_rules !== undefined && d.provider_routing_rules !== null && d.provider_routing_rules !== '') {
      body["provider_routing_rules"] = d.provider_routing_rules;
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

