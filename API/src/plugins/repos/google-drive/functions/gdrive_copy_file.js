const { utils } = require("./utils");

module.exports = {
  async gdrive_copy_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.fileId) return { ok: false, error: "Missing fileId." };
    const body = {};
    if (d.name) body.name = d.name;
    if (d.folderId) body.parents = [d.folderId];
    log('Appel API en cours...');
    const res = await utils.googleRequest(opts, `${utils.DRIVE_API}/files/${d.fileId}/copy?fields=id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
