const { utils } = require('./utils');

module.exports = {
  async instantly_inbox_placement_test_create_createinboxplacementtest(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/inbox-placement-tests";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.delivery_mode !== undefined && d.delivery_mode !== null && d.delivery_mode !== '') {
      body["delivery_mode"] = d.delivery_mode;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.schedule !== undefined && d.schedule !== null && d.schedule !== '') {
      body["schedule"] = d.schedule;
    }
    if (d.schedule_days !== undefined && d.schedule_days !== null && d.schedule_days !== '') {
      if (!body["schedule"] || typeof body["schedule"] !== 'object' || Array.isArray(body["schedule"])) body["schedule"] = {};
      body["schedule"]["days"] = d.schedule_days;
    }
    if (d.schedule_timing !== undefined && d.schedule_timing !== null && d.schedule_timing !== '') {
      if (!body["schedule"] || typeof body["schedule"] !== 'object' || Array.isArray(body["schedule"])) body["schedule"] = {};
      body["schedule"]["timing"] = d.schedule_timing;
    }
    if (d.schedule_timing_from !== undefined && d.schedule_timing_from !== null && d.schedule_timing_from !== '') {
      if (!body["schedule"] || typeof body["schedule"] !== 'object' || Array.isArray(body["schedule"])) body["schedule"] = {};
      if (!body["schedule"]["timing"] || typeof body["schedule"]["timing"] !== 'object' || Array.isArray(body["schedule"]["timing"])) body["schedule"]["timing"] = {};
      body["schedule"]["timing"]["from"] = d.schedule_timing_from;
    }
    if (d.schedule_timezone !== undefined && d.schedule_timezone !== null && d.schedule_timezone !== '') {
      if (!body["schedule"] || typeof body["schedule"] !== 'object' || Array.isArray(body["schedule"])) body["schedule"] = {};
      body["schedule"]["timezone"] = d.schedule_timezone;
    }
    if (d.type !== undefined && d.type !== null && d.type !== '') {
      body["type"] = d.type;
    }
    if (d.sending_method !== undefined && d.sending_method !== null && d.sending_method !== '') {
      body["sending_method"] = d.sending_method;
    }
    if (d.campaign_id !== undefined && d.campaign_id !== null && d.campaign_id !== '') {
      body["campaign_id"] = d.campaign_id;
    }
    if (d.email_subject !== undefined && d.email_subject !== null && d.email_subject !== '') {
      body["email_subject"] = d.email_subject;
    }
    if (d.email_body !== undefined && d.email_body !== null && d.email_body !== '') {
      body["email_body"] = d.email_body;
    }
    if (d.emails !== undefined && d.emails !== null && d.emails !== '') {
      body["emails"] = d.emails;
    }
    if (d.test_code !== undefined && d.test_code !== null && d.test_code !== '') {
      body["test_code"] = d.test_code;
    }
    if (d.tags !== undefined && d.tags !== null && d.tags !== '') {
      body["tags"] = d.tags;
    }
    if (d.text_only !== undefined && d.text_only !== null && d.text_only !== '') {
      body["text_only"] = d.text_only;
    }
    if (d.recipients_labels !== undefined && d.recipients_labels !== null && d.recipients_labels !== '') {
      body["recipients_labels"] = d.recipients_labels;
    }
    if (d.timestamp_next_run !== undefined && d.timestamp_next_run !== null && d.timestamp_next_run !== '') {
      body["timestamp_next_run"] = d.timestamp_next_run;
    }
    if (d.automations !== undefined && d.automations !== null && d.automations !== '') {
      body["automations"] = d.automations;
    }
    if (d.status !== undefined && d.status !== null && d.status !== '') {
      body["status"] = d.status;
    }
    if (d.not_sending_status !== undefined && d.not_sending_status !== null && d.not_sending_status !== '') {
      body["not_sending_status"] = d.not_sending_status;
    }
    if (d.run_immediately !== undefined && d.run_immediately !== null && d.run_immediately !== '') {
      body["run_immediately"] = d.run_immediately;
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

