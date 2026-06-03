const { utils } = require("./utils");

module.exports = {
  async sharepoint_upload_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const siteId = String(d.siteId || "").trim();
    const driveId = String(d.driveId || "").trim();
    const path = String(d.path || "").trim();
    if (!siteId || !driveId || !path) return { ok: false, error: "Le site, le drive et le chemin sont requis." };

    const body = await utils.resolveFileBuffer(d, opts || {});
    log("Téléversement vers SharePoint...");
    const res = await utils.graphRequest(opts, `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${encodeURIComponent(path)}:/content`, {
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
