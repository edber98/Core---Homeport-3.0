const { utils } = require("./utils");

module.exports = {
  async slack_get_reactions(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.timestamp !== undefined && d.timestamp !== "" && d.timestamp !== null) body.timestamp = d.timestamp;

    log('Récupération des données...');
    const res = await utils.slackRequest(opts, "reactions.get", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const msg = res.data.message || {};
    const list = msg.reactions || [];
    return {
      ok: true,
      reactions: list.map(r => ({
        name: r.name || "",
        count: r.count || 0,
        users: (r.users || []).join(", ")
      }))
    };
  }
};
