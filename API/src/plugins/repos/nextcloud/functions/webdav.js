module.exports = {
  async nextcloud_upload_file(node, msg, inputs, opts) {
    return { ok: true, uploaded: true, path: node.args?.path };
  },
  async nextcloud_create_share_link(node, msg, inputs, opts) {
      console.log("credentials", opts)
    return { ok: true, link: 'https://nextcloud.fake/s/' + Math.random().toString(36).slice(2) };
  },
  async nextcloud_set_permissions(node, msg, inputs, opts) {
    return { ok: true, set: true };
  }
};
