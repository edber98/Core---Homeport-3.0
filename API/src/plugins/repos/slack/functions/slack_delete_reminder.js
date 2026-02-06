const { utils } = require("./utils");

module.exports = {
  async slack_delete_reminder(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.reminder !== undefined && d.reminder !== "" && d.reminder !== null) body.reminder = d.reminder;

    const res = await utils.slackRequest(opts, "reminders.delete", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    return { ok: true, status: "success", message: "Opération réussie." };
  }
};
