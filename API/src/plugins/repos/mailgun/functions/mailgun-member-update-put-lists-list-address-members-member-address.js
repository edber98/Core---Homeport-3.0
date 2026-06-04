const { utils } = require('./utils');

module.exports = {
  async mailgun_member_update_put_lists_list_address_members_member_address(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/lists/{list_address}/members/{member_address}";
    const list_address = String(d.list_address || '').trim();
    if (!list_address) return { ok: false, error: 'list_address requis.' };
    reqPath = reqPath.replace('{list_address}', encodeURIComponent(list_address));
    const member_address = String(d.member_address || '').trim();
    if (!member_address) return { ok: false, error: 'member_address requis.' };
    reqPath = reqPath.replace('{member_address}', encodeURIComponent(member_address));

    const query = {};

    const headers = {};

    const body = {};
    if (d.address !== undefined && d.address !== null && d.address !== '') {
      body["address"] = d.address;
    }
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.vars !== undefined && d.vars !== null && d.vars !== '') {
      body["vars"] = d.vars;
    }
    if (d.subscribed !== undefined && d.subscribed !== null && d.subscribed !== '') {
      body["subscribed"] = d.subscribed;
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

