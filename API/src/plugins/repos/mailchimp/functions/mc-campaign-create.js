const { utils } = require("./utils");

module.exports = {
  async mc_campaign_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };
    if (!d.subject) return { ok: false, error: "Missing subject." };

    const body = {
      type: "regular",
      recipients: { list_id: d.listId },
      settings: {
        subject_line: d.subject,
        from_name: d.from_name || "",
        reply_to: d.reply_to || "",
        title: d.title || d.subject
      }
    };
    if (d.templateId) body.settings.template_id = parseInt(d.templateId, 10);

    log('Création en cours...');
    const res = await utils.mailchimpRequest(opts, "/campaigns", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", type: r.type || "", status: r.status || "", title: r.settings?.title || "", subject: r.settings?.subject_line || "", sendTime: r.send_time || "", createTime: r.create_time || "" };
  }
};
