const { utils } = require("./utils");

module.exports = {
  async slack_create_reminder(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.text !== undefined && d.text !== "" && d.text !== null) body.text = d.text;
  if (d.time !== undefined && d.time !== "" && d.time !== null) body.time = d.time;
  if (d.user !== undefined && d.user !== "" && d.user !== null) body.user = d.user;

    log('Création en cours...');
    const res = await utils.slackRequest(opts, "reminders.add", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const r = res.data.reminder || res.data;
    return {
      ok: true,
      id: r.id || "",
      text: r.text || "",
      time: r.time || "",
      complete_ts: r.complete_ts || ""
    };
  }
};
