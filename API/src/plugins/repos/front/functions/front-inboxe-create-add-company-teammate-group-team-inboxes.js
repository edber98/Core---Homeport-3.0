const { utils } = require('./utils');

module.exports = {
  async front_inboxe_create_add_company_teammate_group_team_inboxes(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teammate_groups/{teammate_group_id}/inboxes";
    const teammate_group_id = String(d.teammate_group_id || '').trim();
    if (!teammate_group_id) return { ok: false, error: 'teammate_group_id requis.' };
    reqPath = reqPath.replace('{teammate_group_id}', encodeURIComponent(teammate_group_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.inbox_ids !== undefined && d.inbox_ids !== null && d.inbox_ids !== '') {
      body["inbox_ids"] = d.inbox_ids;
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

