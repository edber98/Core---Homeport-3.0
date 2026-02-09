const { utils } = require("./utils");

module.exports = {
  async brevo_contacts_import(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.listIds) return { ok: false, error: "Missing listIds." };
    if (!d.jsonBody) return { ok: false, error: "Missing jsonBody." };

    let body;
    try { body = JSON.parse(d.jsonBody); } catch { return { ok: false, error: "Invalid JSON body." }; }
    const listIds = d.listIds.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    body.listIds = listIds;

    const res = await utils.brevoRequest(opts, "/contacts/import", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "imported", message: "Import lancé." };
  }
};
