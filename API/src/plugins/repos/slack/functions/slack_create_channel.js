const { utils } = require("./utils");

module.exports = {
  async slack_create_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.name !== undefined && d.name !== "" && d.name !== null) body.name = d.name;
  if (d.is_private !== undefined && d.is_private !== "" && d.is_private !== null) body.is_private = d.is_private;

    log('Création en cours...');
    const res = await utils.slackRequest(opts, "conversations.create", body);
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
