const { utils } = require("./utils");

module.exports = {
  async mc_templates_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const count = parseInt(d.count, 10) || 10;
    const offset = parseInt(d.offset, 10) || 0;

    const res = await utils.mailchimpRequest(opts, "/templates", { query: { count, offset } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.templates) || [];
    const templates = results.map(r => ({ id: String(r.id || ""), name: r.name || "", type: r.type || "", dateCreated: r.date_created || "" }));
    return { ok: true, templates };
  }
};
