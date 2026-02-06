const { utils } = require("./utils");

module.exports = {
  async pipedrive_activity_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const activityId = (d.activityId || "").toString().trim();
    if (!activityId) return { ok: false, error: "Missing activityId." };

    const res = await utils.pdRequest(opts, `/activities/${encodeURIComponent(activityId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Activity ${activityId} deleted.` };
  }
};
