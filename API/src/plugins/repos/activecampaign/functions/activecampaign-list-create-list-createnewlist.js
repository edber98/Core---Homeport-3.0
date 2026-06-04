const { utils } = require('./utils');

module.exports = {
  async activecampaign_list_create_list_createnewlist(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/lists";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.list_name !== undefined && d.list_name !== null && d.list_name !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["name"] = d.list_name;
        }
    if (d.list_stringid !== undefined && d.list_stringid !== null && d.list_stringid !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["stringid"] = d.list_stringid;
        }
    if (d.list_sender_url !== undefined && d.list_sender_url !== null && d.list_sender_url !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["sender_url"] = d.list_sender_url;
        }
    if (d.list_sender_reminder !== undefined && d.list_sender_reminder !== null && d.list_sender_reminder !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["sender_reminder"] = d.list_sender_reminder;
        }
    if (d.list_send_last_broadcast !== undefined && d.list_send_last_broadcast !== null && d.list_send_last_broadcast !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["send_last_broadcast"] = d.list_send_last_broadcast;
        }
    if (d.list_carboncopy !== undefined && d.list_carboncopy !== null && d.list_carboncopy !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["carboncopy"] = d.list_carboncopy;
        }
    if (d.list_subscription_notify !== undefined && d.list_subscription_notify !== null && d.list_subscription_notify !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["subscription_notify"] = d.list_subscription_notify;
        }
    if (d.list_unsubscription_notify !== undefined && d.list_unsubscription_notify !== null && d.list_unsubscription_notify !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["unsubscription_notify"] = d.list_unsubscription_notify;
        }
    if (d.list_user !== undefined && d.list_user !== null && d.list_user !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["user"] = d.list_user;
        }
    if (d.list_channel !== undefined && d.list_channel !== null && d.list_channel !== "") {
          if (!body["list"] || typeof body["list"] !== 'object' || Array.isArray(body["list"])) body["list"] = {};
          body["list"]["channel"] = d.list_channel;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body: requestBody });
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
