const { utils } = require("./utils");

module.exports = {
  async slack_list_files(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.channel !== undefined && d.channel !== "" && d.channel !== null) body.channel = d.channel;
  if (d.types !== undefined && d.types !== "" && d.types !== null) body.types = d.types;
  if (d.count !== undefined && d.count !== "" && d.count !== null) body.count = d.count;

    const res = await utils.slackRequest(opts, "files.list", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const list = res.data.files || [];
    return {
      ok: true,
      files: list.map(f => ({
        id: f.id || "",
        name: f.name || "",
        title: f.title || "",
        mimetype: f.mimetype || "",
        size: f.size || 0,
        url_private: f.url_private || "",
        permalink: f.permalink || ""
      }))
    };
  }
};
