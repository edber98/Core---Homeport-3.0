const { utils } = require("./utils");

module.exports = {
  async slack_delete_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.ts !== undefined && d.ts !== "" && d.ts !== null) body.ts = d.ts;

    log('Suppression en cours...');
    const res = await utils.slackRequest(opts, "chat.delete", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    return { ok: true, status: "success", message: "Opération réussie." };
  }
};
