const { utils } = require("./utils");

module.exports = {
  async clickup_time_entry_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const teamId = String(d.teamId || "").trim();
    const timerId = String(d.timerId || "").trim();
    if (!teamId) return { ok: false, error: "Missing teamId." };
    if (!timerId) return { ok: false, error: "Missing timerId." };

    const res = await utils.clickupRequest(opts, `/team/${encodeURIComponent(teamId)}/time_entries/${encodeURIComponent(timerId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: timerId, success: "true" };
  }
};
