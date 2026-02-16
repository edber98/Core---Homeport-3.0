const { utils } = require("./utils");
const crypto = require("crypto");

module.exports = {
  async mc_member_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };
    if (!d.email) return { ok: false, error: "Missing email." };

    const hash = crypto.createHash("md5").update(d.email.toLowerCase().trim()).digest("hex");
    log('Suppression en cours...');
    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}/members/${hash}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: "Membre supprimé." };
  }
};
