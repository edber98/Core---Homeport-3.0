const { utils } = require("./utils");

module.exports = {
  async gdrive_upload_file(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };

    const metadata = { name: d.name };
    if (d.folderId) metadata.parents = [d.folderId];
    if (d.mimeType) metadata.mimeType = d.mimeType;

    const boundary = "homeport_boundary";
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${d.mimeType || "text/plain"}\r\n\r\n${d.content || ""}\r\n--${boundary}--`;

    const res = await utils.googleRequest(opts, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
      rawBody: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
