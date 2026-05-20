const { utils } = require("./utils");

module.exports = {
  async ahrefs_limits_usage(node, msg, inputs, opts) {
    const res = await utils.ahrefsRequest(opts, "subscriptionInfo", "/limits-and-usage");
    if (!res.ok) return res;
    return { ok: true, target: "workspace", metric: "limits_and_usage", value: "", raw: JSON.stringify(res.data || {}) };
  }
};
