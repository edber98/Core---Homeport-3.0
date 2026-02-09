const { utils } = require("./utils");

module.exports = {
  async nc_file_share(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };
    const body = {
      path: d.path,
      shareType: parseInt(d.shareType || "3", 10),
      permissions: parseInt(d.permissions || "1", 10)
    };
    if (d.shareWith) body.shareWith = d.shareWith;
    const res = await utils.ocsRequest(opts, "/ocs/v2.php/apps/files_sharing/api/v1/shares", {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const share = (res.data && res.data.ocs && res.data.ocs.data) || {};
    return {
      ok: true,
      id: String(share.id || ""),
      shareType: String(share.share_type || ""),
      shareWith: share.share_with || "",
      path: share.path || d.path,
      permissions: String(share.permissions || ""),
      url: share.url || "",
      expiration: share.expiration || ""
    };
  }
};
