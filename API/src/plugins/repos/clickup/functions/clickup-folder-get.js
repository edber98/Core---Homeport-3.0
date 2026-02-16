const { utils } = require("./utils");

module.exports = {
  async clickup_folder_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const folderId = (d.folderId || "").trim();
    if (!folderId) return { ok: false, error: "Missing folderId." };

    log('Récupération des données...');
    const res = await utils.clickupRequest(opts, `/folder/${encodeURIComponent(folderId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id || "", name: r.name || "", hidden: String(r.hidden || false), spaceId: r.space ? r.space.id : "" };
  }
};
