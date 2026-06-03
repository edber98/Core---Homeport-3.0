const { utils } = require('./utils');

module.exports = {
  async yousign_contacts_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const qs = utils.buildQueryString({
        after: d.after || undefined,
        limit: d.limit || 100,
        q: d.q || undefined,
      });
  
      log('Récupération de la liste...');
      const res = await utils.yousignRequest(opts, 'GET', `/contacts${qs}`);
      if (!res.ok) return res;
      const raw = res.data || {};
      const items = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      const contacts = items.map(c => ({
        id: c.id || '',
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        email: c.email || '',
        phone_number: c.phone_number || '',
        company_name: c.company_name || '',
        created_at: c.created_at || '',
      }));
      return { ok: true, contacts, totalCount: String(contacts.length) };
    }
};
