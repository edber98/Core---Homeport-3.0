const { utils } = require("./utils");

module.exports = {
  async typeform_form_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.formId || "").trim()) return { ok: false, error: "Missing formId." };

    const body = {};
    if (d.title) body.title = d.title;
    if (d.type) body.type = d.type;

    log('Mise à jour en cours...');
    const res = await utils.typeformRequest(opts, `/forms/${d.formId}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id || d.formId, title: r.title || d.title || "", type: r.type || "", status: r.settings?.is_public ? "public" : "private", language: r.settings?.language || "", createdAt: r.created_at || "", updatedAt: r.last_updated_at || "", link: r._links?.display || "" };
  }
};
