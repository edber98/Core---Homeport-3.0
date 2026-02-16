const { utils } = require("./utils");

module.exports = {
  async slack_add_bookmark(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.channel_id !== undefined && d.channel_id !== "" && d.channel_id !== null) body.channel_id = d.channel_id;
  if (d.title !== undefined && d.title !== "" && d.title !== null) body.title = d.title;
  if (d.link !== undefined && d.link !== "" && d.link !== null) body.link = d.link;
  if (d.type !== undefined && d.type !== "" && d.type !== null) body.type = d.type;

    log('Création en cours...');
    const res = await utils.slackRequest(opts, "bookmarks.add", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const b = res.data.bookmark || res.data;
    return {
      ok: true,
      id: b.id || "",
      title: b.title || "",
      link: b.link || "",
      type: b.type || ""
    };
  }
};
