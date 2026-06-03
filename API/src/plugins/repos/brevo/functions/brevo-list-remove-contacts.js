const { utils } = require("./utils");

module.exports = {
  async brevo_list_remove_contacts(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const listId = parseInt(d.listId, 10);
    if (isNaN(listId)) return { ok: false, error: "Missing listId." };

    const body = {};
    if (d.all === true || d.all === "true") {
      body.all = true;
    } else if (d.emails) {
      body.emails = String(d.emails).split(/[,\n]/).map((email) => email.trim()).filter(Boolean);
    } else {
      return { ok: false, error: "Emails ou all requis." };
    }

    log("Retrait des contacts...");
    const res = await utils.brevoRequest(opts, `/contacts/lists/${listId}/contacts/remove`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      status: "removed",
      message: `${res.data?.total || body.emails?.length || "Tous les"} contact(s) retiré(s).`
    };
  }
};
