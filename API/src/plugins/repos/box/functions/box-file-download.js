const { utils } = require("./utils");

module.exports = {
  async box_file_download(node, msg, inputs, opts) {
    const fileId = String((inputs && inputs.fileId) || "").trim();
    if (!fileId) return { ok: false, error: "ID du fichier requis." };

    const res = await utils.boxRequest(opts, "GET", `/files/${encodeURIComponent(fileId)}/content`);
    if (!res.ok) return res;

    return { ok: true, id: fileId, type: "file", name: `file_${fileId}`, size: 0, parentId: "", createdAt: "", modifiedAt: "", url: "" };
  }
};
