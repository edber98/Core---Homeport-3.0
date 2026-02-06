const { utils } = require("./utils");

module.exports = {
  async nc_notifications_list(node, msg, inputs, opts) {
    const res = await utils.ocsRequest(opts, "/ocs/v2.php/apps/notifications/api/v2/notifications");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = (res.data && res.data.ocs && res.data.ocs.data) || [];
    const notifications = (Array.isArray(raw) ? raw : []).map(n => ({
      id: String(n.notification_id || n.id || ""),
      subject: n.subject || "",
      message: n.message || "",
      datetime: n.datetime || ""
    }));
    return { ok: true, notifications };
  }
};
