const { utils } = require("./utils");

module.exports = {
  async postman_monitor_delete(node, msg, inputs, opts) {
    const monitorId = String((inputs || {}).monitorId || "").trim();
    if (!monitorId) return { ok: false, error: "ID du monitor requis." };

    const res = await utils.postmanRequest(opts, `/monitors/${encodeURIComponent(monitorId)}`, { method: "DELETE" });
    if (!res.ok) return res;
    return utils.operationResult(res.data || {});
  }
};
