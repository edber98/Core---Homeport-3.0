const { utils } = require("./utils");

module.exports = {
  async docusign_templates_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.count) query.count = d.count;
    if (d.searchText) query.search_text = d.searchText;

    const res = await utils.docusignRequest(opts, "/templates", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.envelopeTemplates) || [];
    const templates = items.map(r => ({ templateId: r.templateId, name: r.name, description: r.description || "", shared: r.shared || "", created: r.created || "" }));
    return { ok: true, templates };
  }
};
