module.exports = {
  async nextcloud_create_share_link(node, msg, inputs, opts) {
    const d = inputs || {};
    const path = d.path || d.filePath || "";
    return { ok: true, link: `https://nextcloud.fake/s/${encodeURIComponent(path || "share")}` };
  }
};
