const { utils } = require("./utils");
module.exports = {
  async notion_user_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const userId = (d.userId || "").trim();
    if (!userId) return { ok: false, error: "Missing userId." };
    log('Récupération des données...');
    const res = await utils.notionRequest(opts, `/users/${encodeURIComponent(userId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name, type: r.type, email: r.person?.email || "", avatar_url: r.avatar_url || "" };
  }
};
