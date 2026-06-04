const { utils } = require('./utils');

module.exports = {
  async front_team_create_add_company_teammate_group_teams(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teammate_groups/{teammate_group_id}/teams";
    const teammate_group_id = String(d.teammate_group_id || '').trim();
    if (!teammate_group_id) return { ok: false, error: 'teammate_group_id requis.' };
    reqPath = reqPath.replace('{teammate_group_id}', encodeURIComponent(teammate_group_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.team_ids !== undefined && d.team_ids !== null && d.team_ids !== '') {
      body["team_ids"] = d.team_ids;
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

