const { utils } = require("./utils");

module.exports = {
  async facebook_list_leads(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const formId = (d.formId || "").trim();
    if (!formId) return { ok: false, error: "Missing formId (Lead Ad Form ID)." };
    const limit = parseInt(d.limit, 10) || 25;

    log('Récupération de la liste...');
    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(formId)}/leads`, {
      query: { limit }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const leads = (r.data || []).map(l => ({
      id: l.id,
      createdTime: l.created_time,
      fields: l.field_data || []
    }));
    return { ok: true, leads };
  }
};
