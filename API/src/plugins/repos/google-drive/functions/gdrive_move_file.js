const { utils } = require("./utils");

module.exports = {
  async gdrive_move_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.fileId || !d.newParentId) return { ok: false, error: "Missing fileId or newParentId." };
    let url = `${utils.DRIVE_API}/files/${d.fileId}?addParents=${d.newParentId}`;
    if (d.oldParentId) url += `&removeParents=${d.oldParentId}`;
    url += "&fields=id,name,mimeType,parents";
    log('Mise à jour en cours...');
    const res = await utils.googleRequest(opts, url, { method: "PATCH", body: {} });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
