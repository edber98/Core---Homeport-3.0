const { utils } = require('./utils');

module.exports = {
  async front_view_create_create_team_view(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teams/{team_id}/views";
    const team_id = String(d.team_id || '').trim();
    if (!team_id) return { ok: false, error: 'team_id requis.' };
    reqPath = reqPath.replace('{team_id}', encodeURIComponent(team_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.inbox_ids !== undefined && d.inbox_ids !== null && d.inbox_ids !== '') {
      body["inbox_ids"] = d.inbox_ids;
    }
    if (d.tag_ids !== undefined && d.tag_ids !== null && d.tag_ids !== '') {
      body["tag_ids"] = d.tag_ids;
    }
    if (d.not_tag_ids !== undefined && d.not_tag_ids !== null && d.not_tag_ids !== '') {
      body["not_tag_ids"] = d.not_tag_ids;
    }
    if (d.no_tags !== undefined && d.no_tags !== null && d.no_tags !== '') {
      body["no_tags"] = d.no_tags;
    }
    if (d.assignee_ids !== undefined && d.assignee_ids !== null && d.assignee_ids !== '') {
      body["assignee_ids"] = d.assignee_ids;
    }
    if (d.not_assignee_ids !== undefined && d.not_assignee_ids !== null && d.not_assignee_ids !== '') {
      body["not_assignee_ids"] = d.not_assignee_ids;
    }
    if (d.highlight !== undefined && d.highlight !== null && d.highlight !== '') {
      body["highlight"] = d.highlight;
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

