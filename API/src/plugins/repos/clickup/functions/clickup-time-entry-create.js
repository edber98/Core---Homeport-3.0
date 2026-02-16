const { utils } = require("./utils");

module.exports = {
  async clickup_time_entry_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const teamId = (d.teamId || "").trim();
    const duration = parseInt(d.duration, 10);
    if (!teamId) return { ok: false, error: "Missing teamId." };
    if (!duration) return { ok: false, error: "Missing duration." };

    const body = { duration, start: Date.now() };
    if (d.taskId) body.tid = d.taskId;
    if (d.description) body.description = d.description;

    log('Création en cours...');
    const res = await utils.clickupRequest(opts, `/team/${encodeURIComponent(teamId)}/time_entries`, {
      method: "POST", body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "created", message: `Entrée de temps créée (${duration}ms).` };
  }
};
