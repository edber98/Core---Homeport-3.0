const { utils } = require("./utils");

module.exports = {
  async pipedrive_person_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing name." };

    const body = { name };
    if (d.email) body.email = [{ value: d.email, primary: true, label: "work" }];
    if (d.phone) body.phone = [{ value: d.phone, primary: true, label: "work" }];
    if (d.org_id) body.org_id = parseInt(d.org_id, 10);

    log('Création en cours...');
    const res = await utils.pdRequest(opts, "/persons", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const email = (Array.isArray(r.email) && r.email.length > 0) ? r.email[0].value : (r.email || "");
    const phone = (Array.isArray(r.phone) && r.phone.length > 0) ? r.phone[0].value : (r.phone || "");
    return { ok: true, id: r.id, name: r.name, email, phone, org_id: r.org_id, add_time: r.add_time };
  }
};
