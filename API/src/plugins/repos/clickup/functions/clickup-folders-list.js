const { utils } = require("./utils");

module.exports = {
  async clickup_folders_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const spaceId = (d.spaceId || "").trim();
    if (!spaceId) return { ok: false, error: "Missing spaceId." };

    log('Récupération de la liste...');
    const res = await utils.clickupRequest(opts, `/space/${encodeURIComponent(spaceId)}/folder`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.folders) || [];
    const folders = results.map(r => ({ id: r.id || "", name: r.name || "", hidden: String(r.hidden || false) }));
    return { ok: true, folders, totalCount: folders.length };
  }
};
