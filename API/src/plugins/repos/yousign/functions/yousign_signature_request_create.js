const { utils } = require('./utils');

module.exports = {
  async yousign_signature_request_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const name = String(d.name || '').trim();
      if (!name) return { ok: false, error: 'Le nom de la demande est requis.' };
  
      const body = { name };
      if (d.delivery_mode) body.delivery_mode = d.delivery_mode;
      if (d.timezone) body.timezone = d.timezone;
      if (d.ordered_signers !== undefined) body.ordered_signers = d.ordered_signers === true || d.ordered_signers === 'true';
      if (d.expiration_date) body.expiration_date = d.expiration_date;
      if (d.external_id) body.external_id = d.external_id;
      if (d.custom_experience_id) body.custom_experience_id = d.custom_experience_id;
      if (d.branding_id) body.branding_id = d.branding_id;
  
      log('Création en cours...');
      const res = await utils.yousignRequest(opts, 'POST', '/signature_requests', body);
      if (!res.ok) return res;
      const sr = res.data || {};
      return {
        ok: true,
        id: sr.id || '',
        name: sr.name || '',
        status: sr.status || '',
        delivery_mode: sr.delivery_mode || '',
        created_at: sr.created_at || '',
        expiration_date: sr.expiration_date || '',
        external_id: sr.external_id || '',
        ordered_signers: sr.ordered_signers || false,
      };
    }
};
