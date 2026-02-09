const { utils } = require("./utils");

module.exports = {
  async typeform_form_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.formId || "").trim()) return { ok: false, error: "Missing formId." };

    const res = await utils.typeformRequest(opts, `/forms/${d.formId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, title: r.title, type: r.type || "", status: r.settings?.is_public ? "public" : "private", language: r.settings?.language || "", createdAt: r.created_at || "", updatedAt: r.last_updated_at || "", link: r._links?.display || "" };
  }
};
