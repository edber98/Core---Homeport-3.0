const { utils } = require("./utils");

module.exports = {
  async gdrive_create_folder(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };
    const body = { name: d.name, mimeType: "application/vnd.google-apps.folder" };
    if (d.parentId) body.parents = [d.parentId];
    const res = await utils.googleRequest(opts, `${utils.DRIVE_API}/files?fields=id,name,mimeType,webViewLink,createdTime,modifiedTime,parents`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
