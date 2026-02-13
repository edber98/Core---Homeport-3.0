const { utils } = require("./utils");

module.exports = {
  async clickup_folder_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const spaceId = (d.spaceId || "").trim();
    const name = (d.name || "").trim();
    if (!spaceId) return { ok: false, error: "Missing spaceId." };
    if (!name) return { ok: false, error: "Missing name." };

    log('Création en cours...');
    const res = await utils.clickupRequest(opts, `/space/${encodeURIComponent(spaceId)}/folder`, {
      method: "POST", body: { name }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", name: r.name || "", hidden: String(r.hidden || false), spaceId: spaceId };
  }
};
