const { utils } = require("./utils");

module.exports = {
  async ms_sp_list_files(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };

    let path;
    if (d.folderId) {
      path = `/sites/${d.siteId}/drive/items/${d.folderId}/children`;
    } else {
      path = `/sites/${d.siteId}/drive/root/children`;
    }

    const res = await utils.graphRequest(opts, path);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const files = (res.data.value || []).map(f => ({
      id: f.id,
      name: f.name,
      size: f.size || 0,
      webUrl: f.webUrl || "",
      createdDateTime: f.createdDateTime || "",
      lastModifiedDateTime: f.lastModifiedDateTime || ""
    }));
    return { ok: true, files };
  }
};
