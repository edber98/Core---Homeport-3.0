const { utils } = require("./utils");

module.exports = {
  async gdrive_download_file(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.fileId) return { ok: false, error: "Missing fileId." };
    let url = `${utils.DRIVE_API}/files/${d.fileId}`;
    if (d.exportMimeType) url += `/export?mimeType=${encodeURIComponent(d.exportMimeType)}`;
    else url += "?alt=media";
    const res = await utils.googleRequest(opts, url, { rawResponse: true });
    if (!res.ok) return { ok: false, error: res.error, status: res.status };
    return { ok: true, id: d.fileId, name: d.fileId, content: res.data, mimeType: res.mimeType };
  }
};
