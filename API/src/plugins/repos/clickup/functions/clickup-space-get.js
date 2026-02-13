const { utils } = require("./utils");

module.exports = {
  async clickup_space_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const spaceId = (d.spaceId || "").trim();
    if (!spaceId) return { ok: false, error: "Missing spaceId." };

    log('Récupération des données...');
    const res = await utils.clickupRequest(opts, `/space/${encodeURIComponent(spaceId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", name: r.name || "", private: String(r.private || false), color: r.color || "" };
  }
};
