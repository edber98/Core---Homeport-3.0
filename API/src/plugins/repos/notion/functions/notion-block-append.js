const { utils } = require("./utils");
module.exports = {
  async notion_block_append(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const blockId = (d.blockId || "").trim();
    const childrenStr = (d.children || "").trim();
    if (!blockId) return { ok: false, error: "Missing blockId." };
    if (!childrenStr) return { ok: false, error: "Missing children." };
    let children;
    try { children = typeof childrenStr === "object" ? childrenStr : JSON.parse(childrenStr); } catch { return { ok: false, error: "Invalid JSON in children." }; }
    log('Appel API en cours...');
    const res = await utils.notionRequest(opts, `/blocks/${encodeURIComponent(blockId)}/children`, { method: "PATCH", body: { children } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "appended", message: `Blocks appended to ${blockId}.` };
  }
};
