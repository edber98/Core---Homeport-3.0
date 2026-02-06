const { utils } = require("./utils");

module.exports = {
  async slack_pin_message(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.timestamp !== undefined && d.timestamp !== "" && d.timestamp !== null) body.timestamp = d.timestamp;

    const res = await utils.slackRequest(opts, "pins.add", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    return { ok: true, status: "success", message: "Opération réussie." };
  }
};
