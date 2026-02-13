const { utils } = require("./utils");

module.exports = {
  async gdrive_upload_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };

    const metadata = { name: d.name };
    if (d.folderId) metadata.parents = [d.folderId];
    if (d.mimeType) metadata.mimeType = d.mimeType;

    let body;
    const fileVal = d.file || d.content;

    if (fileVal && opts.files && typeof fileVal === 'object' && fileVal._type === 'fileRef') {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else if (fileVal && opts.files && typeof fileVal === 'string' && /^https?:\/\//i.test(fileVal)) {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else {
      body = fileVal || "";
    }

    const boundary = "homeport_boundary";
    const contentType = d.mimeType || "application/octet-stream";

    let multipartBody;
    if (Buffer.isBuffer(body)) {
      const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`;
      const endPart = `\r\n--${boundary}--`;
      multipartBody = Buffer.concat([
        Buffer.from(metaPart),
        body,
        Buffer.from(endPart)
      ]);
    } else {
      multipartBody = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n${body}\r\n--${boundary}--`;
    }

    log('Téléversement en cours...');
    const res = await utils.googleRequest(opts, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipartBody,
      rawBody: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
