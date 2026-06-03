const { utils } = require("./utils");

module.exports = {
  async box_collaboration_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.itemId || !d.itemType || !d.login) return { ok: false, error: "Élément et e-mail collaborateur requis." };
    const res = await utils.boxRequest(opts, "POST", "/collaborations", {
      body: { item: { type: d.itemType, id: String(d.itemId) }, accessible_by: { type: "user", login: d.login }, role: d.role || "viewer" }
    });
    if (!res.ok) return res;
    const collab = res.data || {};
    return { ok: true, id: collab.id || "", type: "collaboration", name: collab.accessible_by?.name || d.login, status: collab.status || "", url: "" };
  }
};
