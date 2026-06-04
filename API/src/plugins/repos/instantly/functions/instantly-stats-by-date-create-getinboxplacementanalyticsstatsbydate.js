const { utils } = require('./utils');

module.exports = {
  async instantly_stats_by_date_create_getinboxplacementanalyticsstatsbydate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/inbox-placement-analytics/stats-by-date";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.test_id !== undefined && d.test_id !== null && d.test_id !== '') {
      body["test_id"] = d.test_id;
    }
    if (d.date_from !== undefined && d.date_from !== null && d.date_from !== '') {
      body["date_from"] = d.date_from;
    }
    if (d.date_to !== undefined && d.date_to !== null && d.date_to !== '') {
      body["date_to"] = d.date_to;
    }
    if (d.recipient_geo !== undefined && d.recipient_geo !== null && d.recipient_geo !== '') {
      body["recipient_geo"] = d.recipient_geo;
    }
    if (d.recipient_type !== undefined && d.recipient_type !== null && d.recipient_type !== '') {
      body["recipient_type"] = d.recipient_type;
    }
    if (d.recipient_esp !== undefined && d.recipient_esp !== null && d.recipient_esp !== '') {
      body["recipient_esp"] = d.recipient_esp;
    }
    if (d.sender_email !== undefined && d.sender_email !== null && d.sender_email !== '') {
      body["sender_email"] = d.sender_email;
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

