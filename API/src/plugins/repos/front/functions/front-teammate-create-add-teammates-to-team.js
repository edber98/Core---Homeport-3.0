const { utils } = require('./utils');

module.exports = {
  async front_teammate_create_add_teammates_to_team(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teams/{team_id}/teammates";
    const team_id = String(d.team_id || '').trim();
    if (!team_id) return { ok: false, error: 'team_id requis.' };
    reqPath = reqPath.replace('{team_id}', encodeURIComponent(team_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.teammate_ids !== undefined && d.teammate_ids !== null && d.teammate_ids !== '') {
      body["teammate_ids"] = d.teammate_ids;
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

