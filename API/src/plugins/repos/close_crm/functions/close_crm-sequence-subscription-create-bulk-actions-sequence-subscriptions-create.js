const { utils } = require('./utils');

module.exports = {
  async close_crm_sequence_subscription_create_bulk_actions_sequence_subscriptions_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/bulk_action/sequence_subscription/";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"action_type","target":"action_type","type":"string"},{"key":"contact_preference","target":"contact_preference","type":"string"},{"key":"results_limit","target":"results_limit","type":"string"},{"key":"s_query","target":"s_query","type":"object"},{"key":"sender_account_id","target":"sender_account_id","type":"string"},{"key":"sender_email","target":"sender_email","type":"string"},{"key":"sender_name","target":"sender_name","type":"string"},{"key":"sequence_id","target":"sequence_id","type":"string"},{"key":"sort","target":"sort","type":"array"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

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
