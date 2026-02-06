const { utils } = require("./utils");

module.exports = {
  async slack_reply_message(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.thread_ts !== undefined && d.thread_ts !== "" && d.thread_ts !== null) body.thread_ts = d.thread_ts;
  if (d.text !== undefined && d.text !== "" && d.text !== null) body.text = d.text;

    const res = await utils.slackRequest(opts, "chat.postMessage", body);
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
