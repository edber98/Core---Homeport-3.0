const { utils } = require("./utils");

module.exports = {
  async supa_storage_upload(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.bucket || !d.path) return { ok: false, error: "Bucket et chemin requis." };

    let body;
    const fileVal = d.file || d.content;

    if (fileVal && opts.files && typeof fileVal === 'object' && fileVal._type === 'fileRef') {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else if (fileVal && opts.files && typeof fileVal === 'string' && /^https?:\/\//i.test(fileVal)) {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else {
      body = fileVal || "";
    }

    const res = await utils.supaStorage(opts, `/object/${d.bucket}/${d.path}`, {
      method: "POST",
      body,
      contentType: d.contentType || "application/octet-stream",
      rawBody: true
    });
    if (!res.ok) return res;
    return {
      ok: true, name: d.path, id: res.data?.Id || res.data?.Key || "",
      bucket: d.bucket, size: "", mimeType: d.contentType || "", createdAt: new Date().toISOString()
    };
  }
};
