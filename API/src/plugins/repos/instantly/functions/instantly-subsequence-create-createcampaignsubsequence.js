const { utils } = require('./utils');

module.exports = {
  async instantly_subsequence_create_createcampaignsubsequence(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/subsequences";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.parent_campaign !== undefined && d.parent_campaign !== null && d.parent_campaign !== '') {
      body["parent_campaign"] = d.parent_campaign;
    }
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.conditions !== undefined && d.conditions !== null && d.conditions !== '') {
      body["conditions"] = d.conditions;
    }
    if (d.conditions_crm_status !== undefined && d.conditions_crm_status !== null && d.conditions_crm_status !== '') {
      if (!body["conditions"] || typeof body["conditions"] !== 'object' || Array.isArray(body["conditions"])) body["conditions"] = {};
      body["conditions"]["crm_status"] = d.conditions_crm_status;
    }
    if (d.conditions_lead_activity !== undefined && d.conditions_lead_activity !== null && d.conditions_lead_activity !== '') {
      if (!body["conditions"] || typeof body["conditions"] !== 'object' || Array.isArray(body["conditions"])) body["conditions"] = {};
      body["conditions"]["lead_activity"] = d.conditions_lead_activity;
    }
    if (d.conditions_reply_contains !== undefined && d.conditions_reply_contains !== null && d.conditions_reply_contains !== '') {
      if (!body["conditions"] || typeof body["conditions"] !== 'object' || Array.isArray(body["conditions"])) body["conditions"] = {};
      body["conditions"]["reply_contains"] = d.conditions_reply_contains;
    }
    if (d.subsequence_schedule !== undefined && d.subsequence_schedule !== null && d.subsequence_schedule !== '') {
      body["subsequence_schedule"] = d.subsequence_schedule;
    }
    if (d.subsequence_schedule_start_date !== undefined && d.subsequence_schedule_start_date !== null && d.subsequence_schedule_start_date !== '') {
      if (!body["subsequence_schedule"] || typeof body["subsequence_schedule"] !== 'object' || Array.isArray(body["subsequence_schedule"])) body["subsequence_schedule"] = {};
      body["subsequence_schedule"]["start_date"] = d.subsequence_schedule_start_date;
    }
    if (d.subsequence_schedule_end_date !== undefined && d.subsequence_schedule_end_date !== null && d.subsequence_schedule_end_date !== '') {
      if (!body["subsequence_schedule"] || typeof body["subsequence_schedule"] !== 'object' || Array.isArray(body["subsequence_schedule"])) body["subsequence_schedule"] = {};
      body["subsequence_schedule"]["end_date"] = d.subsequence_schedule_end_date;
    }
    if (d.subsequence_schedule_schedules !== undefined && d.subsequence_schedule_schedules !== null && d.subsequence_schedule_schedules !== '') {
      if (!body["subsequence_schedule"] || typeof body["subsequence_schedule"] !== 'object' || Array.isArray(body["subsequence_schedule"])) body["subsequence_schedule"] = {};
      body["subsequence_schedule"]["schedules"] = d.subsequence_schedule_schedules;
    }
    if (d.sequences !== undefined && d.sequences !== null && d.sequences !== '') {
      body["sequences"] = d.sequences;
    }
    if (d.daily_limit_mode !== undefined && d.daily_limit_mode !== null && d.daily_limit_mode !== '') {
      body["daily_limit_mode"] = d.daily_limit_mode;
    }
    if (d.daily_limit !== undefined && d.daily_limit !== null && d.daily_limit !== '') {
      body["daily_limit"] = d.daily_limit;
    }
    if (d.ignore_account_daily_limit !== undefined && d.ignore_account_daily_limit !== null && d.ignore_account_daily_limit !== '') {
      body["ignore_account_daily_limit"] = d.ignore_account_daily_limit;
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

