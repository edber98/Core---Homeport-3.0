const { utils } = require("./utils");

module.exports = {
  async slack_post_ephemeral(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.user !== undefined && d.user !== "" && d.user !== null) body.user = d.user;
  if (d.text !== undefined && d.text !== "" && d.text !== null) body.text = d.text;

    const res = await utils.slackRequest(opts, "chat.postEphemeral", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    return { ok: true, status: "success", message: "Opération réussie." };
  }
};
