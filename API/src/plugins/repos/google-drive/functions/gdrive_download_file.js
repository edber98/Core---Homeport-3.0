const { utils } = require("./utils");

module.exports = {
  async gdrive_download_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.fileId) return { ok: false, error: "Missing fileId." };
    let url = `${utils.DRIVE_API}/files/${d.fileId}`;
    if (d.exportMimeType) url += `/export?mimeType=${encodeURIComponent(d.exportMimeType)}`;
    else url += "?alt=media";
    log('Récupération des données...');
    const res = await utils.googleRequest(opts, url, { rawResponse: true });
    if (!res.ok) return { ok: false, error: res.error, status: res.status };

    const mimeType = (res.mimeType || "application/octet-stream").split(";")[0].trim();

    // Store downloaded file via opts.files if available
    let file = null;
    if (opts.files && res.data) {
      file = await opts.files.store(res.data, {
        name: d.fileId,
        mimeType,
        lifecycle: "execution"
      });
    }

    return { ok: true, id: d.fileId, name: d.fileId, content: res.data, mimeType, file };
  }
};
