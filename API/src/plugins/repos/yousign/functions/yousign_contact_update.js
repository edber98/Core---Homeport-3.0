const { utils } = require('./utils');
module.exports = {
  async yousign_contact_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const contactId = String(d.contactId || '').trim();
    if (!contactId) return { ok: false, error: 'contactId requis.' };
    const body = {};
    if (d.first_name) body.first_name = d.first_name;
    if (d.last_name) body.last_name = d.last_name;
    if (d.email) body.email = d.email;
    if (d.phone_number) body.phone_number = d.phone_number;
    if (d.company_name) body.company_name = d.company_name;
    if (d.job_title) body.job_title = d.job_title;
    if (d.locale) body.locale = d.locale;
    const res = await utils.yousignRequest(opts, 'PATCH', `/contacts/${encodeURIComponent(contactId)}`, body);
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: c.id || '', first_name: c.first_name || '', last_name: c.last_name || '', email: c.email || '', phone_number: c.phone_number || '', company_name: c.company_name || '', job_title: c.job_title || '', created_at: c.created_at || '' };
  }
};
