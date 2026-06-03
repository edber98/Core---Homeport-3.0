const { utils } = require('./utils');

module.exports = {
  async activecampaign_user_update_user_updateexistinguser(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/users/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.user_username !== undefined && d.user_username !== null && d.user_username !== "") {
          if (!body["user"] || typeof body["user"] !== 'object' || Array.isArray(body["user"])) body["user"] = {};
          body["user"]["username"] = d.user_username;
        }
    if (d.user_password !== undefined && d.user_password !== null && d.user_password !== "") {
          if (!body["user"] || typeof body["user"] !== 'object' || Array.isArray(body["user"])) body["user"] = {};
          body["user"]["password"] = d.user_password;
        }
    if (d.user_email !== undefined && d.user_email !== null && d.user_email !== "") {
          if (!body["user"] || typeof body["user"] !== 'object' || Array.isArray(body["user"])) body["user"] = {};
          body["user"]["email"] = d.user_email;
        }
    if (d.user_firstname !== undefined && d.user_firstname !== null && d.user_firstname !== "") {
          if (!body["user"] || typeof body["user"] !== 'object' || Array.isArray(body["user"])) body["user"] = {};
          body["user"]["firstname"] = d.user_firstname;
        }
    if (d.user_lastname !== undefined && d.user_lastname !== null && d.user_lastname !== "") {
          if (!body["user"] || typeof body["user"] !== 'object' || Array.isArray(body["user"])) body["user"] = {};
          body["user"]["lastname"] = d.user_lastname;
        }
    if (d.user_group !== undefined && d.user_group !== null && d.user_group !== "") {
          if (!body["user"] || typeof body["user"] !== 'object' || Array.isArray(body["user"])) body["user"] = {};
          body["user"]["group"] = d.user_group;
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
