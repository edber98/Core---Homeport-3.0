const { utils } = require("./utils");

module.exports = {
  async slack_update_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.ts !== undefined && d.ts !== "" && d.ts !== null) body.ts = d.ts;
  if (d.text !== undefined && d.text !== "" && d.text !== null) body.text = d.text;

    log('Mise à jour en cours...');
    const res = await utils.slackRequest(opts, "chat.update", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const m = res.data.message || res.data;
    return {
      ok: true,
      channel: m.channel || d.channel || "",
      ts: m.ts || "",
      text: m.text || d.text || "",
      user: m.user || "",
      thread_ts: m.thread_ts || "",
      permalink: m.permalink || ""
    };
  }
};
