const { utils } = require("./utils");

module.exports = {
  async supa_auth_delete_user(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.userId) return { ok: false, error: "ID de l'utilisateur requis." };

    const res = await utils.supaAuth(opts, `/admin/users/${d.userId}`, { method: "DELETE" });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: `Utilisateur ${d.userId} supprimé.`, count: 1 };
  }
};
