const { utils } = require("./utils");

module.exports = {
  async ms_users_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const params = new URLSearchParams();
    if (d.top) params.set("$top", String(d.top));
    if (d.filter) params.set("$filter", d.filter);

    const qs = params.toString();
    const path = `/users${qs ? "?" + qs : ""}`;

    const res = await utils.graphRequest(opts, path);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const users = (res.data.value || []).map(u => ({
      id: u.id,
      displayName: u.displayName || "",
      mail: u.mail || "",
      userPrincipalName: u.userPrincipalName || "",
      jobTitle: u.jobTitle || ""
    }));
    return { ok: true, users };
  }
};
