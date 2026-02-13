const { utils } = require("./utils");

module.exports = {
  async slack_remove_reaction(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.timestamp !== undefined && d.timestamp !== "" && d.timestamp !== null) body.timestamp = d.timestamp;
  if (d.name !== undefined && d.name !== "" && d.name !== null) body.name = d.name;

    log('Mise à jour en cours...');
    const res = await utils.slackRequest(opts, "reactions.remove", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    return { ok: true, status: "success", message: "Opération réussie." };
  }
};
