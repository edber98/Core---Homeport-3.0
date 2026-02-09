const { utils } = require("./utils");

module.exports = {
  async slack_get_permalink(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.message_ts !== undefined && d.message_ts !== "" && d.message_ts !== null) body.message_ts = d.message_ts;

    const res = await utils.slackRequest(opts, "chat.getPermalink", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    return {
      ok: true,
      channel: d.channel || "",
      permalink: res.data.permalink || ""
    };
  }
};
