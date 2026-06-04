const { utils } = require('./utils');

module.exports = {
  async mailgun_memberscsv_create_post_lists_list_address_members_csv(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/lists/{list_address}/members.csv";
    const list_address = String(d.list_address || '').trim();
    if (!list_address) return { ok: false, error: 'list_address requis.' };
    reqPath = reqPath.replace('{list_address}', encodeURIComponent(list_address));

    const query = {};

    const headers = {};

    const body = {};
    if (d.subscribed !== undefined && d.subscribed !== null && d.subscribed !== '') {
      body["subscribed"] = d.subscribed;
    }
    if (d.upsert !== undefined && d.upsert !== null && d.upsert !== '') {
      body["upsert"] = d.upsert;
    }
    if (d.members !== undefined && d.members !== null && d.members !== '') {
      body["members"] = d.members;
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

