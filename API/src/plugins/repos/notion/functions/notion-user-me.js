const { utils } = require("./utils");
module.exports = {
  async notion_user_me(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération du bot actuel...');
    const res = await utils.notionRequest(opts, "/users/me");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name, type: r.type, email: r.person?.email || r.bot?.owner?.user?.person?.email || "", avatar_url: r.avatar_url || "", bot_owner: r.bot?.owner?.type || "" };
  }
};
