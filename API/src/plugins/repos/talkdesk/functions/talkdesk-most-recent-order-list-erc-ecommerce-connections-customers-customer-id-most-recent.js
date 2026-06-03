const { utils } = require('./utils');

module.exports = {
  async talkdesk_most_recent_order_list_erc_ecommerce_connections_customers_customer_id_most_recent(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/erc/ecommerce/connections/customers/{customer_id}/most-recent-order";
    const customer_id = String(d.customer_id || '').trim();
    if (!customer_id) return { ok: false, error: 'customer_id requis.' };
    reqPath = reqPath.replace('{customer_id}', encodeURIComponent(customer_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
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
