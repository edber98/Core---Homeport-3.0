const { utils } = require("./utils");

module.exports = {
  async gdrive_list_files(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const params = new URLSearchParams();
    if (d.folderId) params.set("q", `'${d.folderId}' in parents and trashed = false`);
    else if (d.query) params.set("q", d.query);
    else params.set("q", "trashed = false");
    params.set("pageSize", String(d.pageSize || 100));
    params.set("fields", "files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents)");

    log('Récupération de la liste...');
    const res = await utils.googleRequest(opts, `${utils.DRIVE_API}/files?${params}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, files: res.data.files || [] , totalCount: files.length };
  }
};
