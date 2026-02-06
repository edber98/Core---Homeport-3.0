const { utils } = require("./utils");
const crypto = require("crypto");

module.exports = {
  async mc_member_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };
    if (!d.email) return { ok: false, error: "Missing email." };

    const hash = crypto.createHash("md5").update(d.email.toLowerCase().trim()).digest("hex");
    const body = {};
    if (d.status) body.status = d.status;
    const merge_fields = {};
    if (d.firstName) merge_fields.FNAME = d.firstName;
    if (d.lastName) merge_fields.LNAME = d.lastName;
    if (Object.keys(merge_fields).length) body.merge_fields = merge_fields;

    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}/members/${hash}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", email: r.email_address || "", firstName: r.merge_fields?.FNAME || "", lastName: r.merge_fields?.LNAME || "", status: r.status || "", tags: (r.tags || []).map(t => t.name).join(", ") };
  }
};
