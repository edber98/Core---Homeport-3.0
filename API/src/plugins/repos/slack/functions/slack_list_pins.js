const { utils } = require("./utils");

module.exports = {
  async slack_list_pins(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;

    const res = await utils.slackRequest(opts, "pins.list", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const list = res.data.items || [];
    return {
      ok: true,
      pins: list.map(p => ({
        channel: (p.channel && p.channel.id) || d.channel || "",
        message_ts: (p.message && p.message.ts) || "",
        message_text: (p.message && p.message.text) || ""
      }))
    };
  }
};
