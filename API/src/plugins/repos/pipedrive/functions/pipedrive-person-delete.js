const { utils } = require("./utils");

module.exports = {
  async pipedrive_person_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const personId = (d.personId || "").toString().trim();
    if (!personId) return { ok: false, error: "Missing personId." };

    log('Suppression en cours...');
    const res = await utils.pdRequest(opts, `/persons/${encodeURIComponent(personId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Person ${personId} deleted.` };
  }
};
