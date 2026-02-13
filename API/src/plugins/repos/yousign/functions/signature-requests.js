const { utils } = require('./utils');

module.exports = {
  // ── Créer une demande de signature ─────────────────────
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
  },

  // ── Récupérer une demande de signature ─────────────────
  async yousign_signature_request_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const id = String(d.signature_request_id || '').trim();
    if (!id) return { ok: false, error: "L'ID de la demande est requis." };

    log('Récupération des données...');
    const res = await utils.yousignRequest(opts, 'GET', `/signature_requests/${encodeURIComponent(id)}`);
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
      signers: sr.signers || [],
      documents: sr.documents || [],
      approvers: sr.approvers || [],
    };
  },

  // ── Lister les demandes de signature ───────────────────
  async yousign_signature_requests_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const qs = utils.buildQueryString({
      status: d.status || undefined,
      limit: d.limit || 100,
      after: d.after || undefined,
      q: d.q || undefined,
      external_id: d.external_id || undefined,
    });

    log('Récupération de la liste...');
    const res = await utils.yousignRequest(opts, 'GET', `/signature_requests${qs}`);
    if (!res.ok) return res;
    const raw = res.data || {};
    const items = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    const requests = items.map(sr => ({
      id: sr.id || '',
      name: sr.name || '',
      status: sr.status || '',
      delivery_mode: sr.delivery_mode || '',
      created_at: sr.created_at || '',
      expiration_date: sr.expiration_date || '',
    }));
    return { ok: true, requests, totalCount: String(requests.length) };
  },

  // ── Activer une demande de signature ───────────────────
  async yousign_signature_request_activate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const id = String(d.signature_request_id || '').trim();
    if (!id) return { ok: false, error: "L'ID de la demande est requis." };

    log('Appel API en cours...');
    const res = await utils.yousignRequest(opts, 'POST', `/signature_requests/${encodeURIComponent(id)}/activate`);
    if (!res.ok) return res;
    const sr = res.data || {};
    return {
      ok: true,
      id: sr.id || '',
      name: sr.name || '',
      status: sr.status || '',
      created_at: sr.created_at || '',
    };
  },

  // ── Annuler une demande de signature ───────────────────
  async yousign_signature_request_cancel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const id = String(d.signature_request_id || '').trim();
    if (!id) return { ok: false, error: "L'ID de la demande est requis." };

    const body = {};
    if (d.reason) body.reason = d.reason;
    if (d.custom_note) body.custom_note = d.custom_note;

    log('Appel API en cours...');
    const res = await utils.yousignRequest(opts, 'POST', `/signature_requests/${encodeURIComponent(id)}/cancel`, body);
    if (!res.ok) return res;
    const sr = res.data || {};
    return {
      ok: true,
      id: sr.id || '',
      name: sr.name || '',
      status: sr.status || '',
    };
  },

  // ── Supprimer une demande de signature ─────────────────
  async yousign_signature_request_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const id = String(d.signature_request_id || '').trim();
    if (!id) return { ok: false, error: "L'ID de la demande est requis." };

    const permanent = d.permanent_delete === true || d.permanent_delete === 'true' ? '?permanent_delete=true' : '';
    log('Suppression en cours...');
    const res = await utils.yousignRequest(opts, 'DELETE', `/signature_requests/${encodeURIComponent(id)}${permanent}`);
    if (!res.ok) return res;
    return { ok: true, deleted: true, id };
  },
};
