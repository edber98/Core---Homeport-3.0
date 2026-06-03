const { utils } = require("./utils");

module.exports = {
  async brevo_smtp_emails_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {
      limit: d.limit || 50,
      offset: d.offset || 0,
      email: d.email || undefined,
      templateId: d.templateId || undefined
    };

    const res = await utils.brevoRequest(opts, "/smtp/emails", { method: "GET", query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && (res.data.transactionalEmails || res.data.items || [])) || [];
    return { ok: true, items, totalCount: Number(items.length), nextCursor: "" };
  }
};
