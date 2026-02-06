const { utils } = require("./utils");

module.exports = {
  async slack_upload_file(node, msg, inputs, opts) {
    const d = inputs || {};

    const res = await utils.slackUpload(opts, {
      channels: d.channels || "",
      content: d.content || "",
      filename: d.filename || "file.txt",
      title: d.title || ""
    });
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
