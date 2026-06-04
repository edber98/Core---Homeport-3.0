const { utils } = require('./utils');

module.exports = {
  async instantly_inbox_placement_test_update_patchinboxplacementtest(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/inbox-placement-tests/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
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
    if (d.automations !== undefined && d.automations !== null && d.automations !== '') {
      body["automations"] = d.automations;
    }
    if (d.status !== undefined && d.status !== null && d.status !== '') {
      body["status"] = d.status;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
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

