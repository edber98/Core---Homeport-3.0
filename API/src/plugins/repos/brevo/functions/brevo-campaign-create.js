const { utils } = require("./utils");

module.exports = {
  async brevo_campaign_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };
    if (!d.subject) return { ok: false, error: "Missing subject." };
    if (!d.sender_email) return { ok: false, error: "Missing sender_email." };
    if (!d.listIds) return { ok: false, error: "Missing listIds." };

    const listIds = d.listIds.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const body = {
      name: d.name, subject: d.subject,
      sender: { name: d.sender_name || d.name, email: d.sender_email },
      recipients: { listIds }
    };
    if (d.htmlContent) body.htmlContent = d.htmlContent;
    if (d.templateId) body.templateId = parseInt(d.templateId, 10);

    const res = await utils.brevoRequest(opts, "/emailCampaigns", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: d.name, subject: d.subject, status: "draft", type: "classic", createdAt: new Date().toISOString(), scheduledAt: "" };
  }
};
