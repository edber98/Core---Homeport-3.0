const { utils } = require("./utils");

module.exports = {
  async sharepoint_share_link(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const itemId = String(d.itemId || "").trim();
    const type = String(d.type || "view").trim();
    if (!itemId) return { ok: false, error: "L'élément est requis." };

    log("Création du lien de partage SharePoint...");
    const res = await utils.graphRequest(opts, `/me/drive/items/${encodeURIComponent(itemId)}/createLink`, {
      method: "POST",
      body: { type, scope: "anonymous" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const data = res.data || {};
    return {
      ok: true,
      link: data.link?.webUrl || "",
      itemId,
      type
    };
  }
};
