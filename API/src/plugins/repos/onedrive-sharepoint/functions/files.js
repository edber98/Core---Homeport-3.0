module.exports = {
  async onedrive_upload_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
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

    return { ok: true, uploaded: true, path: d.path || args?.path };
  },
  async sharepoint_upload_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
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

    return { ok: true, uploaded: true };
  },
  async sharepoint_share_link(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return { ok: true, link: 'https://sharepoint.fake/link/' + (args?.itemId || '') };
  }
};
