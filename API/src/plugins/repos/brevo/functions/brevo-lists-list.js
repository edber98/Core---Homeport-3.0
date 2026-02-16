const { utils } = require("./utils");

module.exports = {
  async brevo_lists_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const offset = parseInt(d.offset, 10) || 0;

    log('Récupération de la liste...');
    const res = await utils.brevoRequest(opts, "/contacts/lists", { query: { limit, offset } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.lists) || [];
    const lists = results.map(r => ({ id: String(r.id || ""), name: r.name || "", totalSubscribers: String(r.totalSubscribers || 0), folderId: String(r.folderId || ""), createdAt: r.createdAt || "" }));
    return { ok: true, lists, totalCount: res.data?.count || 0 };
  }
};
