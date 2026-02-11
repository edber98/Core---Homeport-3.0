const { utils } = require("./utils");

module.exports = {
  async slack_upload_file(node, msg, inputs, opts) {
    const d = inputs || {};

    let body;
    const fileVal = d.file || d.content;

    if (fileVal && opts.files && typeof fileVal === 'object' && fileVal._type === 'fileRef') {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else if (fileVal && opts.files && typeof fileVal === 'string' && /^https?:\/\//i.test(fileVal)) {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else {
      body = fileVal || "";
    }

    const res = await utils.slackUpload(opts, {
      channels: d.channels || "",
      content: body,
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
