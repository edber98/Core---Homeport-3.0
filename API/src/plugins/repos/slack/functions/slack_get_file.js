const { utils } = require("./utils");

module.exports = {
  async slack_get_file(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.file !== undefined && d.file !== "" && d.file !== null) body.file = d.file;

    const res = await utils.slackRequest(opts, "files.info", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const f = res.data.file || res.data;
    return {
      ok: true,
      id: f.id || "",
      name: f.name || "",
      title: f.title || "",
      mimetype: f.mimetype || "",
      size: f.size || 0,
      url_private: f.url_private || "",
      permalink: f.permalink || ""
    };
  }
};
