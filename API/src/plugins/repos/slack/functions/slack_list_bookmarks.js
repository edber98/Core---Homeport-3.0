const { utils } = require("./utils");

module.exports = {
  async slack_list_bookmarks(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.channel_id !== undefined && d.channel_id !== "" && d.channel_id !== null) body.channel_id = d.channel_id;

    log('Création en cours...');
    const res = await utils.slackRequest(opts, "bookmarks.list", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const list = res.data.bookmarks || [];
    return {
      ok: true,
      bookmarks: list.map(b => ({
        id: b.id || "",
        title: b.title || "",
        link: b.link || "",
        type: b.type || ""
      }))
    };
  }
};
