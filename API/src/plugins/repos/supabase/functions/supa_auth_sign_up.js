const { utils } = require("./utils");

module.exports = {
  async supa_auth_sign_up(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.email || !d.password) return { ok: false, error: "Email et mot de passe requis." };

    const body = { email: d.email, password: d.password };
    if (d.phone) body.phone = d.phone;
    if (d.metadata) {
      try { body.data = typeof d.metadata === "string" ? JSON.parse(d.metadata) : d.metadata; } catch {}
    }

    const res = await utils.supaAuth(opts, "/signup", { method: "POST", body });
    if (!res.ok) return res;
    const u = res.data.user || res.data;
    return {
      ok: true, id: u.id || "", email: u.email || "", phone: u.phone || "",
      role: u.role || "", createdAt: u.created_at || "", lastSignInAt: u.last_sign_in_at || ""
    };
  }
};
