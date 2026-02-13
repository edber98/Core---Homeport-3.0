const { utils } = require('./utils');

module.exports = {
  // ── Ajouter un signataire ──────────────────────────────
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
  },

  // ── Lister les signataires d'une demande ───────────────
  async yousign_signers_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const srId = String(d.signature_request_id || '').trim();
    if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };

    log('Récupération de la liste...');
    const res = await utils.yousignRequest(opts, 'GET', `/signature_requests/${encodeURIComponent(srId)}/signers`);
    if (!res.ok) return res;
    const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    const signers = items.map(s => {
      const si = s.info || {};
      return {
        id: s.id || '',
        status: s.status || '',
        first_name: si.first_name || '',
        last_name: si.last_name || '',
        email: si.email || '',
        signature_level: s.signature_level || '',
        signature_link: s.signature_link || '',
      };
    });
    return { ok: true, signers, totalCount: String(signers.length) };
  },

  // ── Récupérer un signataire ────────────────────────────
  async yousign_signer_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const id = String(d.signer_id || '').trim();
    if (!id) return { ok: false, error: "L'ID du signataire est requis." };

    log('Récupération des données...');
    const res = await utils.yousignRequest(opts, 'GET', `/signers/${encodeURIComponent(id)}`);
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
      signed_at: s.signed_at || '',
      created_at: s.created_at || '',
    };
  },

  // ── Envoyer un rappel à un signataire ──────────────────
  async yousign_signer_send_reminder(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const srId = String(d.signature_request_id || '').trim();
    const signerId = String(d.signer_id || '').trim();
    if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };
    if (!signerId) return { ok: false, error: "L'ID du signataire est requis." };

    log('Création en cours...');
    const res = await utils.yousignRequest(opts, 'POST', `/signature_requests/${encodeURIComponent(srId)}/signers/${encodeURIComponent(signerId)}/send_reminder`);
    if (!res.ok) return res;
    return { ok: true, sent: true, signer_id: signerId };
  },
};
