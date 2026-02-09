const { utils } = require("./utils");

module.exports = {
  async intercom_data_events_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.userId || "").trim()) return { ok: false, error: "Missing userId." };

    const query = { type: d.type || "user", intercom_user_id: d.userId };
    const res = await utils.intercomRequest(opts, "/events", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: JSON.stringify((res.data?.events || res.data?.data || [])) };
  }
};
