const { utils } = require("./utils");

module.exports = {
  async nc_file_upload(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };

    let body;
    let fileName = '';
    const fileVal = d.file || d.content;

    if (fileVal && opts.files && typeof fileVal === 'object' && fileVal._type === 'fileRef') {
      // fileRef from upload → resolve to buffer
      const buf = await opts.files.resolveAsBuffer(fileVal);
      body = buf;
      fileName = fileVal.name || '';
    } else if (fileVal && opts.files && typeof fileVal === 'string' && /^https?:\/\//i.test(fileVal)) {
      // URL string from expression → resolve to buffer
      const resolved = await opts.files.resolve(fileVal);
      const chunks = []; for await (const c of resolved.stream) chunks.push(c);
      body = Buffer.concat(chunks);
      fileName = resolved.record?.name || '';
    } else {
      // Plain text or base64 string (rétrocompat)
      body = fileVal || "";
    }

    // Ensure path points to a file, not just a directory
    let uploadPath = d.path || '/';
    if (fileName && (uploadPath.endsWith('/') || !uploadPath.includes('.'))) {
      uploadPath = uploadPath.replace(/\/+$/, '') + '/' + fileName;
    }

    log('Téléversement en cours...');
    const res = await utils.webdavRequest(opts, uploadPath, {
      method: "PUT",
      body,
      rawBody: true,
      headers: { "Content-Type": "application/octet-stream" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "uploaded", message: `Fichier téléversé: ${d.path}` };
  }
};
