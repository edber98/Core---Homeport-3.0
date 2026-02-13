const { utils } = require("./utils");

module.exports = {
  async clickup_tags_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const spaceId = (d.spaceId || "").trim();
    if (!spaceId) return { ok: false, error: "Missing spaceId." };

    log('Récupération de la liste...');
    const res = await utils.clickupRequest(opts, `/space/${encodeURIComponent(spaceId)}/tag`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const tags = (res.data && res.data.tags) || [];
    return { ok: true, status: "success", message: JSON.stringify(tags) };
  }
};
