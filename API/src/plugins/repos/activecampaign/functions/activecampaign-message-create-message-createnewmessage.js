const { utils } = require('./utils');

module.exports = {
  async activecampaign_message_create_message_createnewmessage(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/messages";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.message_fromname !== undefined && d.message_fromname !== null && d.message_fromname !== "") {
          if (!body["message"] || typeof body["message"] !== 'object' || Array.isArray(body["message"])) body["message"] = {};
          body["message"]["fromname"] = d.message_fromname;
        }
    if (d.message_email !== undefined && d.message_email !== null && d.message_email !== "") {
          if (!body["message"] || typeof body["message"] !== 'object' || Array.isArray(body["message"])) body["message"] = {};
          body["message"]["email"] = d.message_email;
        }
    if (d.message_reply2 !== undefined && d.message_reply2 !== null && d.message_reply2 !== "") {
          if (!body["message"] || typeof body["message"] !== 'object' || Array.isArray(body["message"])) body["message"] = {};
          body["message"]["reply2"] = d.message_reply2;
        }
    if (d.message_subject !== undefined && d.message_subject !== null && d.message_subject !== "") {
          if (!body["message"] || typeof body["message"] !== 'object' || Array.isArray(body["message"])) body["message"] = {};
          body["message"]["subject"] = d.message_subject;
        }
    if (d.message_preheader_text !== undefined && d.message_preheader_text !== null && d.message_preheader_text !== "") {
          if (!body["message"] || typeof body["message"] !== 'object' || Array.isArray(body["message"])) body["message"] = {};
          body["message"]["preheader_text"] = d.message_preheader_text;
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
