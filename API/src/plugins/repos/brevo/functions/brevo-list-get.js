const { utils } = require("./utils");

module.exports = {
  async brevo_list_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const listId = parseInt(d.listId, 10);
    if (isNaN(listId)) return { ok: false, error: "Missing listId." };

    const res = await utils.brevoRequest(opts, `/contacts/lists/${listId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", totalSubscribers: String(r.totalSubscribers || 0), folderId: String(r.folderId || ""), createdAt: r.createdAt || "" };
  }
};
