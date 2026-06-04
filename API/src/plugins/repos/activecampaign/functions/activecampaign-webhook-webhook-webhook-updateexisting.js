const { utils } = require('./utils');

module.exports = {
  async activecampaign_webhook_webhook_webhook_updateexisting(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/webhooks/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.webhook_name !== undefined && d.webhook_name !== null && d.webhook_name !== "") {
          if (!body["webhook"] || typeof body["webhook"] !== 'object' || Array.isArray(body["webhook"])) body["webhook"] = {};
          body["webhook"]["name"] = d.webhook_name;
        }
    if (d.webhook_url !== undefined && d.webhook_url !== null && d.webhook_url !== "") {
          if (!body["webhook"] || typeof body["webhook"] !== 'object' || Array.isArray(body["webhook"])) body["webhook"] = {};
          body["webhook"]["url"] = d.webhook_url;
        }
    if (d.webhook_events !== undefined && d.webhook_events !== null && d.webhook_events !== "") {
          if (!body["webhook"] || typeof body["webhook"] !== 'object' || Array.isArray(body["webhook"])) body["webhook"] = {};
          body["webhook"]["events"] = d.webhook_events;
        }
    if (d.webhook_sources !== undefined && d.webhook_sources !== null && d.webhook_sources !== "") {
          if (!body["webhook"] || typeof body["webhook"] !== 'object' || Array.isArray(body["webhook"])) body["webhook"] = {};
          body["webhook"]["sources"] = d.webhook_sources;
        }
    if (d.webhook_listid !== undefined && d.webhook_listid !== null && d.webhook_listid !== "") {
          if (!body["webhook"] || typeof body["webhook"] !== 'object' || Array.isArray(body["webhook"])) body["webhook"] = {};
          body["webhook"]["listid"] = d.webhook_listid;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
