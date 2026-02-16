const { utils } = require("./utils");

module.exports = {
  async gdrive_get_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const fileId = (inputs || {}).fileId;
    if (!fileId) return { ok: false, error: "Missing fileId." };
    log('Récupération des données...');
    const res = await utils.googleRequest(opts, `${utils.DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
