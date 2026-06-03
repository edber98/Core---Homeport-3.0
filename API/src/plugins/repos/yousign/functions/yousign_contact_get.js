const { utils } = require('./utils');

module.exports = {
  async yousign_contact_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const id = String(d.contact_id || '').trim();
      if (!id) return { ok: false, error: "L'ID du contact est requis." };
  
      log('Récupération des données...');
      const res = await utils.yousignRequest(opts, 'GET', `/contacts/${encodeURIComponent(id)}`);
      if (!res.ok) return res;
      const c = res.data || {};
      return {
        ok: true,
        id: c.id || '',
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        email: c.email || '',
        phone_number: c.phone_number || '',
        company_name: c.company_name || '',
        job_title: c.job_title || '',
        created_at: c.created_at || '',
      };
    }
};
