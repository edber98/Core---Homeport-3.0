const { utils } = require("./utils");
module.exports = {
  async notion_block_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const blockId = (d.blockId || "").trim();
    if (!blockId) return { ok: false, error: "Missing blockId." };
    log('Suppression en cours...');
    const res = await utils.notionRequest(opts, `/blocks/${encodeURIComponent(blockId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Block ${blockId} deleted.` };
  }
};
