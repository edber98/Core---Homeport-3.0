const { utils } = require("./utils");
const crypto = require("crypto");

module.exports = {
  async mc_member_add(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };
    if (!d.email) return { ok: false, error: "Missing email." };

    const body = {
      email_address: d.email,
      status: d.status || "subscribed"
    };
    const merge_fields = {};
    if (d.firstName) merge_fields.FNAME = d.firstName;
    if (d.lastName) merge_fields.LNAME = d.lastName;
    if (Object.keys(merge_fields).length) body.merge_fields = merge_fields;

    log('Création en cours...');
    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}/members`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", email: r.email_address || "", firstName: r.merge_fields?.FNAME || "", lastName: r.merge_fields?.LNAME || "", status: r.status || "", tags: (r.tags || []).map(t => t.name).join(", ") };
  }
};
