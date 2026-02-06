const { utils } = require("./utils");

module.exports = {
  async brevo_list_add_contacts(node, msg, inputs, opts) {
    const d = inputs || {};
    const listId = parseInt(d.listId, 10);
    if (isNaN(listId)) return { ok: false, error: "Missing listId." };
    if (!d.emails) return { ok: false, error: "Missing emails." };

    const emails = d.emails.split(/[,\n]/).map(e => e.trim()).filter(Boolean);
    const res = await utils.brevoRequest(opts, `/contacts/lists/${listId}/contacts/add`, { method: "POST", body: { emails } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "added", message: `${emails.length} contact(s) ajouté(s).` };
  }
};
