const { utils } = require("./utils");

module.exports = {
  async onedrive_upload_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "Le chemin est requis." };

    const body = await utils.resolveFileBuffer(d, opts || {});
    log("Téléversement vers OneDrive...");
    const res = await utils.graphRequest(opts, `/me/drive/root:/${encodeURIComponent(path)}:/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      rawBody: body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const data = res.data || {};
    return {
      ok: true,
      name: data.name || path.split("/").pop() || "",
      path,
      contentType: data.file?.mimeType || "",
      size: String(data.size || body.length || 0),
      file: data.id || ""
    };
  }
};
