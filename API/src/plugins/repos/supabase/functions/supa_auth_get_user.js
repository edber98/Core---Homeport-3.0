const { utils } = require("./utils");

module.exports = {
  async supa_auth_get_user(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.userId) return { ok: false, error: "ID de l'utilisateur requis." };

    const res = await utils.supaAuth(opts, `/admin/users/${d.userId}`);
    if (!res.ok) return res;
    const u = res.data;
    return {
      ok: true, id: u.id || "", email: u.email || "", phone: u.phone || "",
      role: u.role || "", createdAt: u.created_at || "", lastSignInAt: u.last_sign_in_at || ""
    };
  }
};
