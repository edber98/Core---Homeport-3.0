module.exports = {
  async onedrive_upload_file(node, msg, inputs) {
    return { ok: true, uploaded: true, path: node.args?.path };
  },
  async sharepoint_upload_file(node, msg, inputs) {
    return { ok: true, uploaded: true };
  },
  async sharepoint_share_link(node, msg, inputs) {
    return { ok: true, link: 'https://sharepoint.fake/link/' + (node.args?.itemId || '') };
  }
};

