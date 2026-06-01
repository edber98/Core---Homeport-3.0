const { utils } = require("./utils");

module.exports = {
  async clickup_time_entry_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const teamId = String(d.teamId || "").trim();
    const timerId = String(d.timerId || "").trim();
    if (!teamId) return { ok: false, error: "Missing teamId." };
    if (!timerId) return { ok: false, error: "Missing timerId." };

    const body = {};
    if (d.start) body.start = Number(d.start);
    if (d.end) body.end = Number(d.end);
    if (d.tid) body.tid = String(d.tid);
    if (d.description) body.description = String(d.description);
    if (!Object.keys(body).length) return { ok: false, error: "No fields to update." };

    const res = await utils.clickupRequest(opts, `/team/${encodeURIComponent(teamId)}/time_entries/${encodeURIComponent(timerId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: timerId, status: "updated", message: "Entrée de temps modifiée.", data: res.data || null };
  }
};
