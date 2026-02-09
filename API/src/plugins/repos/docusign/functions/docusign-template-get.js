const { utils } = require("./utils");

module.exports = {
  async docusign_template_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.templateId || "").trim()) return { ok: false, error: "Missing templateId." };

    const res = await utils.docusignRequest(opts, `/templates/${d.templateId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, templateId: r.templateId, name: r.name, description: r.description || "", shared: r.shared || "", created: r.created || "" };
  }
};
