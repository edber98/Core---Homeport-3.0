const { utils } = require('./utils');

module.exports = {
  // ── Créer un contact ───────────────────────────────────
  async yousign_contact_create(node, msg, inputs, opts) {
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
  },

  // ── Lister les contacts ────────────────────────────────
  async yousign_contacts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const qs = utils.buildQueryString({
      after: d.after || undefined,
      limit: d.limit || 100,
      q: d.q || undefined,
    });

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
  },

  // ── Récupérer un contact ───────────────────────────────
  async yousign_contact_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const id = String(d.contact_id || '').trim();
    if (!id) return { ok: false, error: "L'ID du contact est requis." };

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
  },

  // ── Supprimer un contact ───────────────────────────────
  async yousign_contact_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const id = String(d.contact_id || '').trim();
    if (!id) return { ok: false, error: "L'ID du contact est requis." };

    const res = await utils.yousignRequest(opts, 'DELETE', `/contacts/${encodeURIComponent(id)}`);
    if (!res.ok) return res;
    return { ok: true, deleted: true, id };
  },
};
