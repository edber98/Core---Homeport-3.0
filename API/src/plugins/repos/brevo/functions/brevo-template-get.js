const { utils } = require("./utils");

module.exports = {
  async brevo_template_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const templateId = parseInt(d.templateId, 10);
    if (isNaN(templateId)) return { ok: false, error: "Missing templateId." };

    log('Récupération des données...');
    const res = await utils.brevoRequest(opts, `/smtp/templates/${templateId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", subject: r.subject || "", htmlContent: r.htmlContent || "", createdAt: r.createdAt || "" };
  }
};
