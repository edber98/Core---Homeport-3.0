const { utils } = require("./utils");

module.exports = {
  async slack_get_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;

    log('Récupération des données...');
    const res = await utils.slackRequest(opts, "conversations.info", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const ch = res.data.channel || res.data;
    return {
      ok: true,
      id: ch.id || "",
      name: ch.name || "",
      is_private: !!ch.is_private,
      topic: (ch.topic && ch.topic.value) || "",
      purpose: (ch.purpose && ch.purpose.value) || "",
      num_members: ch.num_members || 0
    };
  }
};
