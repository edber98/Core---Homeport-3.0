const { utils } = require("./utils");

module.exports = {
  async slack_list_reminders(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};


    const res = await utils.slackRequest(opts, "reminders.list", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const list = res.data.reminders || [];
    return {
      ok: true,
      reminders: list.map(r => ({
        id: r.id || "",
        text: r.text || "",
        time: r.time || "",
        complete_ts: r.complete_ts || ""
      }))
    };
  }
};
