const { utils } = require('./utils');

module.exports = {
  async activecampaign_accountcontact_update_account_updateassociation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/accountContacts/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.accountcontact_account !== undefined && d.accountcontact_account !== null && d.accountcontact_account !== "") {
          if (!body["accountcontact"] || typeof body["accountcontact"] !== 'object' || Array.isArray(body["accountcontact"])) body["accountcontact"] = {};
          body["accountcontact"]["account"] = d.accountcontact_account;
        }
    if (d.accountcontact_contact !== undefined && d.accountcontact_contact !== null && d.accountcontact_contact !== "") {
          if (!body["accountcontact"] || typeof body["accountcontact"] !== 'object' || Array.isArray(body["accountcontact"])) body["accountcontact"] = {};
          body["accountcontact"]["contact"] = d.accountcontact_contact;
        }
    if (d.accountcontact_jobtitle !== undefined && d.accountcontact_jobtitle !== null && d.accountcontact_jobtitle !== "") {
          if (!body["accountcontact"] || typeof body["accountcontact"] !== 'object' || Array.isArray(body["accountcontact"])) body["accountcontact"] = {};
          body["accountcontact"]["jobtitle"] = d.accountcontact_jobtitle;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
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
