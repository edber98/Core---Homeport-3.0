const { utils } = require("./utils");

module.exports = {
  async clickup_time_entries_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const teamId = (d.teamId || "").trim();
    if (!teamId) return { ok: false, error: "Missing teamId." };

    const res = await utils.clickupRequest(opts, `/team/${encodeURIComponent(teamId)}/time_entries`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const entries = (res.data && res.data.data) || [];
    return { ok: true, status: "success", message: JSON.stringify(entries) };
  }
};
