const { utils } = require('./utils');

module.exports = {
  async aircall_contact_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/contacts";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const parseJsonField = (value, fieldName) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (typeof value === 'object') return value;
      try { return JSON.parse(String(value)); } catch { return { __parseError: `JSON invalide dans ${fieldName}.` }; }
    };

    const phoneNumbers = parseJsonField(d.phone_numbers, 'phone_numbers');
    if (phoneNumbers && phoneNumbers.__parseError) return { ok: false, error: phoneNumbers.__parseError };
    const emails = parseJsonField(d.emails, 'emails');
    if (emails && emails.__parseError) return { ok: false, error: emails.__parseError };

    const body = {};
    if (d.first_name !== undefined && d.first_name !== null && d.first_name !== '') body.first_name = d.first_name;
    if (d.last_name !== undefined && d.last_name !== null && d.last_name !== '') body.last_name = d.last_name;
    if (d.company_name !== undefined && d.company_name !== null && d.company_name !== '') body.company_name = d.company_name;
    if (d.information !== undefined && d.information !== null && d.information !== '') body.information = d.information;
    if (phoneNumbers !== undefined) body.phone_numbers = phoneNumbers;
    if (emails !== undefined) body.emails = emails;
    if (!Array.isArray(body.phone_numbers) || body.phone_numbers.length === 0) {
      return { ok: false, error: 'phone_numbers requis et doit être un tableau JSON non vide.' };
    }

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
