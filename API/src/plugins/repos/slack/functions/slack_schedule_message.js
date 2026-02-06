const { utils } = require("./utils");

module.exports = {
  async slack_schedule_message(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.text !== undefined && d.text !== "" && d.text !== null) body.text = d.text;
  if (d.post_at !== undefined && d.post_at !== "" && d.post_at !== null) body.post_at = d.post_at;
  if (body.post_at) body.post_at = Number(body.post_at);

    const res = await utils.slackRequest(opts, "chat.scheduleMessage", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const m = res.data.message || res.data;
    return {
      ok: true,
      channel: m.channel || d.channel || "",
      ts: m.ts || "",
      text: m.text || d.text || "",
      user: m.user || "",
      thread_ts: m.thread_ts || "",
      permalink: m.permalink || ""
    };
  }
};
