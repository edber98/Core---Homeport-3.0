const { utils } = require("./utils");

module.exports = {
  async typeform_form_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.formId || "").trim()) return { ok: false, error: "Missing formId." };

    const res = await utils.typeformRequest(opts, `/forms/${d.formId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: "Formulaire supprimé." };
  }
};
