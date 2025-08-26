module.exports = {
  async gdrive_upload_file(node, msg, inputs) {
    return { ok: true, uploaded: true, name: node.args?.name };
  },
  async gdrive_share_link(node, msg, inputs) {
    return { ok: true, link: 'https://drive.fake/link/' + (node.args?.fileId || '') };
  }
};

