const { utils } = require('./utils');

module.exports = {
  async talkdesk_spendlimit_search_fsi_contacts_contact_id_cards_card_id_spendlimits_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/fsi/contacts/{contact_id}/cards/{card_id}/spendLimits";
    const contact_id = String(d.contact_id || '').trim();
    if (!contact_id) return { ok: false, error: 'contact_id requis.' };
    reqPath = reqPath.replace('{contact_id}', encodeURIComponent(contact_id));
    const card_id = String(d.card_id || '').trim();
    if (!card_id) return { ok: false, error: 'card_id requis.' };
    reqPath = reqPath.replace('{card_id}', encodeURIComponent(card_id));

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
