const { utils } = require("./utils");

module.exports = {
  async datadog_dashboard_delete(node, msg, inputs, opts) {
    const dashboardId = String((inputs || {}).dashboardId || "").trim();
    if (!dashboardId) return { ok: false, error: "ID du dashboard requis." };
    const res = await utils.datadogRequest(opts, `/api/v1/dashboard/${encodeURIComponent(dashboardId)}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, success: "true", message: "Dashboard supprimé.", raw: res.data || null };
  }
};
