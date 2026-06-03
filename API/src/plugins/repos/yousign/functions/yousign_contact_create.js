const { utils } = require('./utils');

module.exports = {
  async yousign_contact_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const firstName = String(d.first_name || '').trim();
      const lastName = String(d.last_name || '').trim();
      const email = String(d.email || '').trim();
      if (!firstName) return { ok: false, error: 'Le prénom est requis.' };
      if (!lastName) return { ok: false, error: 'Le nom est requis.' };
      if (!email) return { ok: false, error: "L'adresse e-mail est requise." };
  
      const body = { first_name: firstName, last_name: lastName, email };
      if (d.phone_number) body.phone_number = d.phone_number;
      if (d.company_name) body.company_name = d.company_name;
      if (d.job_title) body.job_title = d.job_title;
      if (d.locale) body.locale = d.locale;
  
      log('Création en cours...');
      const res = await utils.yousignRequest(opts, 'POST', '/contacts', body);
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
