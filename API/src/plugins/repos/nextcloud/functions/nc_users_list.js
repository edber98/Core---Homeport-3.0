const { utils } = require("./utils");

module.exports = {
  async nc_users_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const params = new URLSearchParams();
    if (d.search) params.set("search", d.search);
    if (d.limit) params.set("limit", String(d.limit));
    if (d.offset) params.set("offset", String(d.offset));
    const qs = params.toString();
    const res = await utils.ocsRequest(opts, `/ocs/v1.php/cloud/users${qs ? "?" + qs : ""}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = (res.data && res.data.ocs && res.data.ocs.data && res.data.ocs.data.users) || [];
    const users = (Array.isArray(raw) ? raw : []).map(u => {
      if (typeof u === "string") return { id: u, displayName: "", email: "", phone: "", quota: "" };
      return {
        id: u.id || "",
        displayName: u.displayName || u.displayname || "",
        email: u.email || "",
        phone: u.phone || "",
        quota: u.quota ? JSON.stringify(u.quota) : ""
      };
    });
    const totalCount = parseInt(res.data?.ocs?.meta?.totalitems, 10) || users.length;
    return { ok: true, totalCount, users };
  }
};
