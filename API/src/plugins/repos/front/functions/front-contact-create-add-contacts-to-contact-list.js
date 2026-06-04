const { utils } = require('./utils');

module.exports = {
  async front_contact_create_add_contacts_to_contact_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contact_lists/{contact_list_id}/contacts";
    const contact_list_id = String(d.contact_list_id || '').trim();
    if (!contact_list_id) return { ok: false, error: 'contact_list_id requis.' };
    reqPath = reqPath.replace('{contact_list_id}', encodeURIComponent(contact_list_id));

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

