const { utils } = require('./utils');

module.exports = {
  async xero_repeating_invoice_list_attachments(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/RepeatingInvoices/{repeatingInvoiceId}/Attachments";
    const repeatinginvoiceid = String(d.repeatinginvoiceid || '').trim();
    if (!repeatinginvoiceid) return { ok: false, error: 'repeatinginvoiceid requis.' };
    reqPath = reqPath.replace('{repeatinginvoiceid}', encodeURIComponent(repeatinginvoiceid));

    const query = {};
    

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
