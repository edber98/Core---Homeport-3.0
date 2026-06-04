const { utils } = require('./utils');

module.exports = {
  async mailgun_slack_update_put_v1_alerts_settings_slack(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/alerts/settings/slack";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.token !== undefined && d.token !== null && d.token !== '') {
      body["token"] = d.token;
    }
    if (d.team_id !== undefined && d.team_id !== null && d.team_id !== '') {
      body["team_id"] = d.team_id;
    }
    if (d.team_name !== undefined && d.team_name !== null && d.team_name !== '') {
      body["team_name"] = d.team_name;
    }
    if (d.scope !== undefined && d.scope !== null && d.scope !== '') {
      body["scope"] = d.scope;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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

