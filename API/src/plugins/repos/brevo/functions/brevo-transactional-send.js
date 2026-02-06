const { utils } = require("./utils");

module.exports = {
  async brevo_transactional_send(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.to_email) return { ok: false, error: "Missing to_email." };
    if (!d.sender_email) return { ok: false, error: "Missing sender_email." };
    if (!d.subject) return { ok: false, error: "Missing subject." };

    const body = {
      to: [{ email: d.to_email, name: d.to_name || "" }],
      sender: { email: d.sender_email, name: d.sender_name || "" },
      subject: d.subject
    };
    if (d.htmlContent) body.htmlContent = d.htmlContent;
    if (d.templateId) body.templateId = parseInt(d.templateId, 10);

    const res = await utils.brevoRequest(opts, "/smtp/email", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, messageId: r.messageId || "", status: "sent" };
  }
};
