const { utils } = require("./utils");

module.exports = {
  async nc_activity_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const params = new URLSearchParams();
    if (d.type && d.type !== "all") params.set("type", d.type);
    if (d.limit) params.set("limit", String(d.limit));
    const qs = params.toString();
    const res = await utils.ocsRequest(opts, `/ocs/v2.php/apps/activity/api/v2/activity${qs ? "?" + qs : ""}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = (res.data && res.data.ocs && res.data.ocs.data) || [];
    const activities = (Array.isArray(raw) ? raw : []).map(a => ({
      id: String(a.activity_id || a.id || ""),
      type: a.type || "",
      subject: a.subject || "",
      datetime: a.datetime || a.date || "",
      user: a.user || ""
    }));
    const totalCount = parseInt(res.data?.ocs?.meta?.totalitems, 10) || activities.length;
    return { ok: true, totalCount, activities };
  }
};
