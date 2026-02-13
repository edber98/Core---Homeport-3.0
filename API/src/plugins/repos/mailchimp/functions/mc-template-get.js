const { utils } = require("./utils");

module.exports = {
  async mc_template_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const templateId = parseInt(d.templateId, 10);
    if (isNaN(templateId)) return { ok: false, error: "Missing templateId." };

    log('Récupération des données...');
    const res = await utils.mailchimpRequest(opts, `/templates/${templateId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", type: r.type || "", dateCreated: r.date_created || "" };
  }
};
