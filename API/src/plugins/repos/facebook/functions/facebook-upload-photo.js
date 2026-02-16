const { utils } = require("./utils");

module.exports = {
  async facebook_upload_photo(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };
    const fileVal = d.url;
    if (!fileVal) return { ok: false, error: "Missing photo." };
    const caption = (d.caption || "").trim();

    log('Téléversement en cours...');

    let res;
    // Case 1: fileRef object from a previous node or file upload
    if (fileVal && typeof fileVal === 'object' && (fileVal._type === 'fileRef' || fileVal.fileId)) {
      if (!opts.files) return { ok: false, error: "File storage not available." };
      const buffer = await opts.files.resolveAsBuffer(fileVal);
      const mimeType = fileVal.mimeType || fileVal.contentType || 'image/jpeg';
      const extraFields = {};
      if (caption) extraFields.caption = caption;
      res = await utils.facebookUploadPhoto(opts, `/${encodeURIComponent(pageId)}/photos`, buffer, mimeType, extraFields);
    }
    // Case 2: string URL - use the original URL-based upload
    else {
      const url = (typeof fileVal === 'string' ? fileVal : '').trim();
      if (!url) return { ok: false, error: "Missing photo URL." };
      const body = { url };
      if (caption) body.caption = caption;
      res = await utils.facebookRequest(opts, `/${encodeURIComponent(pageId)}/photos`, {
        method: "POST",
        body
      });
    }

    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, postId: r.post_id, pageId };
  }
};
