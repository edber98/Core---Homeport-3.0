const { utils } = require('./utils');

module.exports = {
  async activecampaign_accountcustomfieldmeta_update_field_updatecustomfieldmeta(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/accountCustomFieldMeta/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.accountcustomfieldmetum_fieldlabel !== undefined && d.accountcustomfieldmetum_fieldlabel !== null && d.accountcustomfieldmetum_fieldlabel !== "") {
          if (!body["accountcustomfieldmetum"] || typeof body["accountcustomfieldmetum"] !== 'object' || Array.isArray(body["accountcustomfieldmetum"])) body["accountcustomfieldmetum"] = {};
          body["accountcustomfieldmetum"]["fieldlabel"] = d.accountcustomfieldmetum_fieldlabel;
        }
    if (d.accountcustomfieldmetum_fieldoptions !== undefined && d.accountcustomfieldmetum_fieldoptions !== null && d.accountcustomfieldmetum_fieldoptions !== "") {
          if (!body["accountcustomfieldmetum"] || typeof body["accountcustomfieldmetum"] !== 'object' || Array.isArray(body["accountcustomfieldmetum"])) body["accountcustomfieldmetum"] = {};
          body["accountcustomfieldmetum"]["fieldoptions"] = d.accountcustomfieldmetum_fieldoptions;
        }
    if (d.accountcustomfieldmetum_fielddefault !== undefined && d.accountcustomfieldmetum_fielddefault !== null && d.accountcustomfieldmetum_fielddefault !== "") {
          if (!body["accountcustomfieldmetum"] || typeof body["accountcustomfieldmetum"] !== 'object' || Array.isArray(body["accountcustomfieldmetum"])) body["accountcustomfieldmetum"] = {};
          body["accountcustomfieldmetum"]["fielddefault"] = d.accountcustomfieldmetum_fielddefault;
        }
    if (d.accountcustomfieldmetum_isformvisible !== undefined && d.accountcustomfieldmetum_isformvisible !== null && d.accountcustomfieldmetum_isformvisible !== "") {
          if (!body["accountcustomfieldmetum"] || typeof body["accountcustomfieldmetum"] !== 'object' || Array.isArray(body["accountcustomfieldmetum"])) body["accountcustomfieldmetum"] = {};
          body["accountcustomfieldmetum"]["isformvisible"] = d.accountcustomfieldmetum_isformvisible;
        }
    if (d.accountcustomfieldmetum_displayorder !== undefined && d.accountcustomfieldmetum_displayorder !== null && d.accountcustomfieldmetum_displayorder !== "") {
          if (!body["accountcustomfieldmetum"] || typeof body["accountcustomfieldmetum"] !== 'object' || Array.isArray(body["accountcustomfieldmetum"])) body["accountcustomfieldmetum"] = {};
          body["accountcustomfieldmetum"]["displayorder"] = d.accountcustomfieldmetum_displayorder;
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
