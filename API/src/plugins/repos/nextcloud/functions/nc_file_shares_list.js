const { utils } = require("./utils");

module.exports = {
  async nc_file_shares_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const params = new URLSearchParams();
    if (d.path) params.set("path", d.path);
    if (d.reshares) params.set("reshares", "true");
    const qs = params.toString();
    const path = `/ocs/v2.php/apps/files_sharing/api/v1/shares${qs ? "?" + qs : ""}`;
    const res = await utils.ocsRequest(opts, path);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = (res.data && res.data.ocs && res.data.ocs.data) || [];
    const shares = (Array.isArray(raw) ? raw : []).map(s => ({
      id: String(s.id || ""),
      shareType: String(s.share_type || ""),
      shareWith: s.share_with || "",
      path: s.path || "",
      permissions: String(s.permissions || ""),
      url: s.url || "",
      expiration: s.expiration || ""
    }));
    return { ok: true, shares };
  }
};
