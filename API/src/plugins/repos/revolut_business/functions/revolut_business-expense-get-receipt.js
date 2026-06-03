const { utils } = require('./utils');

module.exports = {
  async revolut_business_expense_get_receipt(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/expenses/{expenseId}/receipts/{receiptId}/content";
    const expenseid = String(d.expenseid || '').trim();
    if (!expenseid) return { ok: false, error: 'expenseid requis.' };
    reqPath = reqPath.replace('{expenseid}', encodeURIComponent(expenseid));
    const receiptid = String(d.receiptid || '').trim();
    if (!receiptid) return { ok: false, error: 'receiptid requis.' };
    reqPath = reqPath.replace('{receiptid}', encodeURIComponent(receiptid));

    const query = {};
    

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      ...(r && typeof r === 'object' ? r : { value: r }),
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
