const { utils } = require("./utils");

module.exports = {
  async fd_group_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const groupId = parseInt(d.groupId, 10);
    if (isNaN(groupId)) return { ok: false, error: "Missing groupId." };

    log('Récupération des données...');
    const res = await utils.freshdeskRequest(opts, `/groups/${groupId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", description: r.description || "", createdAt: r.created_at || "" };
  }
};
