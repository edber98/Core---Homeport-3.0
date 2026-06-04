const { utils } = require('./utils');

module.exports = {
  async mailgun_test_create_post_v1_alerts_slack_test(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/alerts/slack/test";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.event_type !== undefined && d.event_type !== null && d.event_type !== '') {
      body["event_type"] = d.event_type;
    }
    if (d.channel_ids !== undefined && d.channel_ids !== null && d.channel_ids !== '') {
      body["channel_ids"] = d.channel_ids;
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

