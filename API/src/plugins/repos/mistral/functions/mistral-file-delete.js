const { utils } = require("./utils");

module.exports = {
  async mistral_file_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const fileId = String(d.fileId || "").trim();
    if (!fileId) return { ok: false, error: "fileId requis." };

    const res = await utils.mistralRequest(opts, `/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      id: fileId,
      text: "deleted",
      json: JSON.stringify(res.data || {})
    };
  }
};
