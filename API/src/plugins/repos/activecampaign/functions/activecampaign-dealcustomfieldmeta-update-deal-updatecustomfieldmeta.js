const { utils } = require('./utils');

module.exports = {
  async activecampaign_dealcustomfieldmeta_update_deal_updatecustomfieldmeta(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/dealCustomFieldMeta/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.dealcustomfieldmetum_fieldlabel !== undefined && d.dealcustomfieldmetum_fieldlabel !== null && d.dealcustomfieldmetum_fieldlabel !== "") {
          if (!body["dealcustomfieldmetum"] || typeof body["dealcustomfieldmetum"] !== 'object' || Array.isArray(body["dealcustomfieldmetum"])) body["dealcustomfieldmetum"] = {};
          body["dealcustomfieldmetum"]["fieldlabel"] = d.dealcustomfieldmetum_fieldlabel;
        }
    if (d.dealcustomfieldmetum_fieldoptions !== undefined && d.dealcustomfieldmetum_fieldoptions !== null && d.dealcustomfieldmetum_fieldoptions !== "") {
          if (!body["dealcustomfieldmetum"] || typeof body["dealcustomfieldmetum"] !== 'object' || Array.isArray(body["dealcustomfieldmetum"])) body["dealcustomfieldmetum"] = {};
          body["dealcustomfieldmetum"]["fieldoptions"] = d.dealcustomfieldmetum_fieldoptions;
        }
    if (d.dealcustomfieldmetum_fielddefault !== undefined && d.dealcustomfieldmetum_fielddefault !== null && d.dealcustomfieldmetum_fielddefault !== "") {
          if (!body["dealcustomfieldmetum"] || typeof body["dealcustomfieldmetum"] !== 'object' || Array.isArray(body["dealcustomfieldmetum"])) body["dealcustomfieldmetum"] = {};
          body["dealcustomfieldmetum"]["fielddefault"] = d.dealcustomfieldmetum_fielddefault;
        }
    if (d.dealcustomfieldmetum_isformvisible !== undefined && d.dealcustomfieldmetum_isformvisible !== null && d.dealcustomfieldmetum_isformvisible !== "") {
          if (!body["dealcustomfieldmetum"] || typeof body["dealcustomfieldmetum"] !== 'object' || Array.isArray(body["dealcustomfieldmetum"])) body["dealcustomfieldmetum"] = {};
          body["dealcustomfieldmetum"]["isformvisible"] = d.dealcustomfieldmetum_isformvisible;
        }
    if (d.dealcustomfieldmetum_displayorder !== undefined && d.dealcustomfieldmetum_displayorder !== null && d.dealcustomfieldmetum_displayorder !== "") {
          if (!body["dealcustomfieldmetum"] || typeof body["dealcustomfieldmetum"] !== 'object' || Array.isArray(body["dealcustomfieldmetum"])) body["dealcustomfieldmetum"] = {};
          body["dealcustomfieldmetum"]["displayorder"] = d.dealcustomfieldmetum_displayorder;
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
