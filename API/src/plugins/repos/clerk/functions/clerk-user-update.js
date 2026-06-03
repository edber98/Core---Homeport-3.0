const { utils } = require("./utils");

module.exports = {
  async clerk_user_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const userId = String(d.userId || "").trim();
    if (!userId) return { ok: false, error: "ID utilisateur requis." };
    const body = {};
    if (d.firstName !== undefined) body.first_name = String(d.firstName || "");
    if (d.lastName !== undefined) body.last_name = String(d.lastName || "");
    if (d.username !== undefined) body.username = String(d.username || "");
    if (d.password) body.password = String(d.password);
    if (d.publicMetadata) {
      try { body.public_metadata = utils.parseJsonInput(d.publicMetadata, "Métadonnées publiques"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.privateMetadata) {
      try { body.private_metadata = utils.parseJsonInput(d.privateMetadata, "Métadonnées privées"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (!Object.keys(body).length) return { ok: false, error: "Aucun champ à modifier." };
    log("Mise à jour de l'utilisateur Clerk...");
    const res = await utils.clerkRequest(opts, `/users/${encodeURIComponent(userId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactUser(res.data || {}) };
  }
};
