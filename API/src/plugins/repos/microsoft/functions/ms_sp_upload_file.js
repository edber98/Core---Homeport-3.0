const { utils } = require("./utils");

module.exports = {
  async ms_sp_upload_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.path) return { ok: false, error: "Missing path." };

    const content = d.content || "";
    log('Téléversement en cours...');
    const res = await utils.graphRequest(opts, `/sites/${d.siteId}/drive/root:/${d.path}:/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: content,
      rawBody: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const f = res.data;
    return {
      ok: true,
      id: f.id,
      name: f.name,
      size: f.size || 0,
      webUrl: f.webUrl || "",
      createdDateTime: f.createdDateTime || "",
      lastModifiedDateTime: f.lastModifiedDateTime || ""
    };
  }
};
