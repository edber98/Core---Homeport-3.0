const { utils } = require("./utils");

module.exports = {
  async brevo_templates_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 50;
    const offset = parseInt(d.offset, 10) || 0;

    const res = await utils.brevoRequest(opts, "/smtp/templates", { query: { limit, offset } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.templates) || [];
    const templates = results.map(r => ({ id: String(r.id || ""), name: r.name || "", subject: r.subject || "", createdAt: r.createdAt || "" }));
    return { ok: true, templates };
  }
};
