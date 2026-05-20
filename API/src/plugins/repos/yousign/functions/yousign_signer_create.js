const { utils } = require('./utils');

module.exports = {
  async yousign_signer_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const srId = String(d.signature_request_id || '').trim();
      if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };
  
      const info = {};
      const firstName = String(d.first_name || '').trim();
      const lastName = String(d.last_name || '').trim();
      const email = String(d.email || '').trim();
      if (!firstName) return { ok: false, error: 'Le prénom est requis.' };
      if (!lastName) return { ok: false, error: 'Le nom est requis.' };
      if (!email) return { ok: false, error: "L'adresse e-mail est requise." };
  
      info.first_name = firstName;
      info.last_name = lastName;
      info.email = email;
      if (d.phone_number) info.phone_number = d.phone_number;
      if (d.locale) info.locale = d.locale;
  
      const body = { info };
      if (d.signature_level) body.signature_level = d.signature_level;
      if (d.signature_authentication_mode) body.signature_authentication_mode = d.signature_authentication_mode;
      if (d.redirect_urls) {
        try {
          body.redirect_urls = typeof d.redirect_urls === 'string' ? JSON.parse(d.redirect_urls) : d.redirect_urls;
        } catch {}
      }
      if (d.custom_text) {
        try {
          body.custom_text = typeof d.custom_text === 'string' ? JSON.parse(d.custom_text) : d.custom_text;
        } catch {}
      }
  
      log('Création en cours...');
      const res = await utils.yousignRequest(opts, 'POST', `/signature_requests/${encodeURIComponent(srId)}/signers`, body);
      if (!res.ok) return res;
      const s = res.data || {};
      const si = s.info || {};
      return {
        ok: true,
        id: s.id || '',
        status: s.status || '',
        first_name: si.first_name || '',
        last_name: si.last_name || '',
        email: si.email || '',
        phone_number: si.phone_number || '',
        signature_level: s.signature_level || '',
        signature_link: s.signature_link || '',
        created_at: s.created_at || '',
      };
    }
};
