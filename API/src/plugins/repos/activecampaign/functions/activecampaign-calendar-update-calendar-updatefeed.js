const { utils } = require('./utils');

module.exports = {
  async activecampaign_calendar_update_calendar_updatefeed(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/calendars/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.calendar_title !== undefined && d.calendar_title !== null && d.calendar_title !== "") {
          if (!body["calendar"] || typeof body["calendar"] !== 'object' || Array.isArray(body["calendar"])) body["calendar"] = {};
          body["calendar"]["title"] = d.calendar_title;
        }
    if (d.calendar_type !== undefined && d.calendar_type !== null && d.calendar_type !== "") {
          if (!body["calendar"] || typeof body["calendar"] !== 'object' || Array.isArray(body["calendar"])) body["calendar"] = {};
          body["calendar"]["type"] = d.calendar_type;
        }
    if (d.calendar_notification !== undefined && d.calendar_notification !== null && d.calendar_notification !== "") {
          if (!body["calendar"] || typeof body["calendar"] !== 'object' || Array.isArray(body["calendar"])) body["calendar"] = {};
          body["calendar"]["notification"] = d.calendar_notification;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
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
