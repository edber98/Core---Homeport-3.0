const { utils } = require("./utils");

module.exports = {
  async mc_list_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };

    const body = {};
    if (d.name) body.name = d.name;
    if (d.permissionReminder) body.permission_reminder = d.permissionReminder;
    if (d.emailTypeOption !== undefined) body.email_type_option = !!d.emailTypeOption;
    if (d.contact) body.contact = typeof d.contact === "object" ? d.contact : JSON.parse(String(d.contact));
    if (d.campaignDefaults) body.campaign_defaults = typeof d.campaignDefaults === "object" ? d.campaignDefaults : JSON.parse(String(d.campaignDefaults));

    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", name: r.name || "", memberCount: String(r.stats?.member_count || 0), dateCreated: r.date_created || "" };
  }
};
