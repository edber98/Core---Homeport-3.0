const { utils } = require("./utils");

module.exports = {
  async mc_list_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };

    const body = {
      name: d.name,
      permission_reminder: d.permission_reminder || "You signed up for updates.",
      contact: { company: d.name, address1: "", city: "", state: "", zip: "", country: "FR" },
      campaign_defaults: {
        from_name: d.from_name || "", from_email: d.from_email || "",
        subject: d.subject || "", language: d.language || "fr"
      },
      email_type_option: true
    };

    log('Création en cours...');
    const res = await utils.mailchimpRequest(opts, "/lists", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", name: r.name || "", memberCount: "0", dateCreated: r.date_created || "" };
  }
};
