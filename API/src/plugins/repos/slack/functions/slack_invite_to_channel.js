const { utils } = require("./utils");

module.exports = {
  async slack_invite_to_channel(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.users !== undefined && d.users !== "" && d.users !== null) body.users = d.users;
  if (body.users && typeof body.users === "string") body.users = body.users.split(",").map(u => u.trim()).filter(Boolean);

    const res = await utils.slackRequest(opts, "conversations.invite", body);
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
