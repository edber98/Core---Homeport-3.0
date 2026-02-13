const { utils } = require("./utils");

module.exports = {
  async slack_list_channels(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.types !== undefined && d.types !== "" && d.types !== null) body.types = d.types;
  if (d.limit !== undefined && d.limit !== "" && d.limit !== null) body.limit = d.limit;

    log('Récupération de la liste...');
    const res = await utils.slackRequest(opts, "conversations.list", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const list = res.data.channels || [];
    return {
      ok: true,
      channels: list.map(ch => ({
        id: ch.id || "",
        name: ch.name || "",
        is_private: !!ch.is_private,
        topic: (ch.topic && ch.topic.value) || "",
        purpose: (ch.purpose && ch.purpose.value) || "",
        num_members: ch.num_members || 0
      }))
    };
  }
};
