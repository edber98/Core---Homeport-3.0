const { utils } = require("./utils");

module.exports = {
  async box_shared_link_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.itemId || !d.itemType) return { ok: false, error: "Type et ID de l'élément requis." };
    const path = d.itemType === "folder" ? `/folders/${encodeURIComponent(d.itemId)}` : `/files/${encodeURIComponent(d.itemId)}`;
    const body = { shared_link: { access: d.access || "open" } };
    if (d.password) body.shared_link.password = d.password;
    const res = await utils.boxRequest(opts, "PUT", path, { body });
    if (!res.ok) return res;
    const link = (res.data && res.data.shared_link) || {};
    return { ok: true, id: d.itemId, type: d.itemType, name: res.data?.name || "", url: link.url || "", status: link.access || "" };
  }
};
