const { utils } = require("./utils");

module.exports = {
  async gdrive_share_file(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.fileId) return { ok: false, error: "Missing fileId." };
    const perm = { role: d.role || "reader", type: d.type || "anyone" };
    if (d.emailAddress) perm.emailAddress = d.emailAddress;
    const res = await utils.googleRequest(opts, `${utils.DRIVE_API}/files/${d.fileId}/permissions`, { method: "POST", body: perm });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const file = await utils.googleRequest(opts, `${utils.DRIVE_API}/files/${d.fileId}?fields=id,webViewLink,webContentLink`);
    return { ok: true, id: d.fileId, webViewLink: file.data?.webViewLink || "", webContentLink: file.data?.webContentLink || "" };
  }
};
