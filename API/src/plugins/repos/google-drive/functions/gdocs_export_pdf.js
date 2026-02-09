const { utils } = require("./utils");

module.exports = {
  async gdocs_export_pdf(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.documentId) return { ok: false, error: "Missing documentId." };
    const res = await utils.googleRequest(opts, `${utils.DRIVE_API}/files/${d.documentId}/export?mimeType=application/pdf`, { rawResponse: true });
    if (!res.ok) return { ok: false, error: res.error, status: res.status };
    return { ok: true, documentId: d.documentId, content: res.data, mimeType: "application/pdf" };
  }
};
