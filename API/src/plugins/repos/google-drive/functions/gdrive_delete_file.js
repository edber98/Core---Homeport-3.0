const { utils } = require("./utils");

module.exports = {
  async gdrive_delete_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const fileId = (inputs || {}).fileId;
    if (!fileId) return { ok: false, error: "Missing fileId." };
    log('Suppression en cours...');
    const res = await utils.googleRequest(opts, `${utils.DRIVE_API}/files/${fileId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `File ${fileId} deleted.` };
  }
};
