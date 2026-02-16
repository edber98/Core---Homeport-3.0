const { utils } = require("./utils");

module.exports = {
  async ms_sp_download_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.itemId) return { ok: false, error: "Missing itemId." };

    log('Récupération des données...');
    const res = await utils.graphRequest(opts, `/sites/${d.siteId}/drive/items/${d.itemId}/content`, {
      rawResponse: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status };

    return {
      ok: true,
      id: d.itemId,
      name: "",
      size: 0,
      webUrl: "",
      createdDateTime: "",
      lastModifiedDateTime: "",
      data: res.data,
      mimeType: res.mimeType
    };
  }
};
