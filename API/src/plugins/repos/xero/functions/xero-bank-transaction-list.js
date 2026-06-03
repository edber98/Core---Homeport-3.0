const { utils } = require('./utils');

module.exports = {
  async xero_bank_transaction_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/BankTransactions";
    

    const query = {};
    if (d.ifmodifiedsince !== undefined && d.ifmodifiedsince !== null && d.ifmodifiedsince !== '') query["ifmodifiedsince"] = d.ifmodifiedsince;
    if (d.where !== undefined && d.where !== null && d.where !== '') query["where"] = d.where;
    if (d.order !== undefined && d.order !== null && d.order !== '') query["order"] = d.order;
    if (d.page !== undefined && d.page !== null && d.page !== '') query["page"] = d.page;
    if (d.pagesize !== undefined && d.pagesize !== null && d.pagesize !== '') query["pagesize"] = d.pagesize;
    if (d.unitdp !== undefined && d.unitdp !== null && d.unitdp !== '') query["unitdp"] = d.unitdp;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      ...(r && typeof r === 'object' ? r : { value: r }),
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
