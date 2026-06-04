const { utils } = require('./utils');

module.exports = {
  async customer_io_newsletter_search_createnewsletter(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/newsletters";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"name","target":"name","type":"string"},{"key":"recipients","target":"recipients","type":"object"},{"key":"sendNow","target":"send_now","type":"boolean"},{"key":"scheduledAt","target":"scheduled_at","type":"number"},{"key":"subscriptionTopicId","target":"subscription_topic_id","type":"number"},{"key":"rateLimitEmailRate","target":"rate_limit_email_rate","type":"number"},{"key":"rateLimitTimePeriod","target":"rate_limit_time_period","type":"number"},{"key":"rateLimitSpread","target":"rate_limit_spread","type":"boolean"},{"key":"type","target":"type","type":"string"},{"key":"subject","target":"subject","type":"string"},{"key":"preheaderText","target":"preheader_text","type":"string"},{"key":"messageBody","target":"body","type":"string"},{"key":"bodyPlain","target":"body_plain","type":"string"},{"key":"layoutId","target":"layout_id","type":"number"},{"key":"from","target":"from","type":"string"},{"key":"fromId","target":"from_id","type":"number"},{"key":"bodyJson","target":"body_json","type":"string"},{"key":"requestMethod","target":"request_method","type":"string"},{"key":"url","target":"url","type":"string"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };
  }
};
