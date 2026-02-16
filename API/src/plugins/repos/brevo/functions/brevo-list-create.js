const { utils } = require("./utils");

module.exports = {
  async brevo_list_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing name." };
    const folderId = parseInt(d.folderId, 10);
    if (isNaN(folderId)) return { ok: false, error: "Missing folderId." };

    log('Création en cours...');
    const res = await utils.brevoRequest(opts, "/contacts/lists", { method: "POST", body: { name, folderId } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name, totalSubscribers: "0", folderId: String(folderId), createdAt: new Date().toISOString() };
  }
};
