const { utils } = require("./utils");

module.exports = {
  async nc_file_upload(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };

    let body;
    const fileVal = d.file || d.content;

    if (fileVal && opts.files && typeof fileVal === 'object' && fileVal._type === 'fileRef') {
      // fileRef from upload → resolve to buffer
      const buf = await opts.files.resolveAsBuffer(fileVal);
      body = buf;
    } else if (fileVal && opts.files && typeof fileVal === 'string' && /^https?:\/\//i.test(fileVal)) {
      // URL string from expression → resolve to buffer
      const buf = await opts.files.resolveAsBuffer(fileVal);
      body = buf;
    } else {
      // Plain text or base64 string (rétrocompat)
      body = fileVal || "";
    }

    const res = await utils.webdavRequest(opts, d.path, {
      method: "PUT",
      body,
      rawBody: true,
      headers: { "Content-Type": "application/octet-stream" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "uploaded", message: `Fichier téléversé: ${d.path}` };
  }
};
