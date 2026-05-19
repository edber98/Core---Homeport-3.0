module.exports = {
  async nextcloud_upload_file(node, msg, inputs, opts) {
    const d = inputs || {};
    return { ok: true, uploaded: true, path: d.path || "" };
  }
};
