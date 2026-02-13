const { utils } = require("./utils");

module.exports = {
  async typeform_response_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.formId || "").trim()) return { ok: false, error: "Missing formId." };
    if (!(d.responseId || "").trim()) return { ok: false, error: "Missing responseId." };

    log('Suppression en cours...');
    const res = await utils.typeformRequest(opts, `/forms/${d.formId}/responses`, { method: "DELETE", query: { included_tokens: d.responseId } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: "Réponse supprimée." };
  }
};
