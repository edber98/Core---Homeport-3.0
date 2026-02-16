const { utils } = require("./utils");

module.exports = {
  async asana_user_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const userGid = (d.userGid || "").trim();
    if (!userGid) return { ok: false, error: "Missing userGid." };

    log('Récupération des données...');
    const res = await utils.asanaRequest(opts, `/users/${encodeURIComponent(userGid)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return { ok: true, gid: r.gid || "", name: r.name || "", email: r.email || "" };
  }
};
