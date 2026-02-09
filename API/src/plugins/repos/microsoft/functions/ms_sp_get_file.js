const { utils } = require("./utils");

module.exports = {
  async ms_sp_get_file(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.itemId) return { ok: false, error: "Missing itemId." };

    const res = await utils.graphRequest(opts, `/sites/${d.siteId}/drive/items/${d.itemId}`);
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
