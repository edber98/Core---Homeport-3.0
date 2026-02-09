const { utils } = require("./utils");

module.exports = {
  async pipedrive_person_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const personId = (d.personId || "").toString().trim();
    if (!personId) return { ok: false, error: "Missing personId." };

    const res = await utils.pdRequest(opts, `/persons/${encodeURIComponent(personId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const email = (Array.isArray(r.email) && r.email.length > 0) ? r.email[0].value : (r.email || "");
    const phone = (Array.isArray(r.phone) && r.phone.length > 0) ? r.phone[0].value : (r.phone || "");
    return { ok: true, id: r.id, name: r.name, email, phone, org_id: r.org_id, add_time: r.add_time };
  }
};
