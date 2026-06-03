const { utils } = require("./utils");

module.exports = {
  async box_file_delete(node, msg, inputs, opts) {
    const fileId = String((inputs && inputs.fileId) || "").trim();
    if (!fileId) return { ok: false, error: "ID du fichier requis." };
    const res = await utils.boxRequest(opts, "DELETE", `/files/${encodeURIComponent(fileId)}`);
    if (!res.ok) return res;
    return { ok: true, id: fileId, type: "file", name: "", status: "deleted" };
  }
};
