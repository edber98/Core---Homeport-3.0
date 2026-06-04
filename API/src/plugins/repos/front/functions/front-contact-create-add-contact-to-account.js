const { utils } = require('./utils');

module.exports = {
  async front_contact_create_add_contact_to_account(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/accounts/{account_id}/contacts";
    const account_id = String(d.account_id || '').trim();
    if (!account_id) return { ok: false, error: 'account_id requis.' };
    reqPath = reqPath.replace('{account_id}', encodeURIComponent(account_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.contact_ids !== undefined && d.contact_ids !== null && d.contact_ids !== '') {
      body["contact_ids"] = d.contact_ids;
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

