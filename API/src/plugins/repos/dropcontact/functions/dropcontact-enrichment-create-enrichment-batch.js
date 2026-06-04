const { utils } = require('./utils');

module.exports = {
  async dropcontact_enrichment_create_enrichment_batch(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/enrich/all";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let contacts;
    try { contacts = typeof d.contacts === 'object' ? d.contacts : JSON.parse(String(d.contacts || '[]')); }
    catch { return { ok: false, error: 'JSON invalide dans les contacts.' }; }
    if (!Array.isArray(contacts) || contacts.length === 0) return { ok: false, error: 'Au moins un contact est requis.' };
    const body = { data: contacts };
    if (d.siren !== undefined && d.siren !== null && d.siren !== '') body.siren = d.siren === true || String(d.siren).toLowerCase() === 'true';
    if (d.language !== undefined && d.language !== null && d.language !== '') body.language = String(d.language);
    if (d.customCallbackUrl !== undefined && d.customCallbackUrl !== null && d.customCallbackUrl !== '') body.custom_callback_url = String(d.customCallbackUrl);

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
