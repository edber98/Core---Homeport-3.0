const { utils } = require("./utils");

module.exports = {
  async gdrive_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Missing query." };
    const params = new URLSearchParams();
    params.set("q", `fullText contains '${d.query.replace(/'/g, "\\'")}' and trashed = false`);
    params.set("pageSize", String(d.pageSize || 50));
    params.set("fields", "files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents)");
    log('Recherche en cours...');
    const res = await utils.googleRequest(opts, `${utils.DRIVE_API}/files?${params}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, files: res.data.files || [] };
  }
};
