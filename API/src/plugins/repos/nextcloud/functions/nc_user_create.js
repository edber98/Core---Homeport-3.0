const { utils } = require("./utils");

module.exports = {
  async nc_user_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.userid) return { ok: false, error: "Identifiant requis." };
    if (!d.password) return { ok: false, error: "Mot de passe requis." };
    const body = { userid: d.userid, password: d.password };
    if (d.displayName) body.displayName = d.displayName;
    if (d.email) body.email = d.email;
    if (d.groups) body.groups = d.groups.split(",").map(g => g.trim());
    const res = await utils.ocsRequest(opts, "/ocs/v1.php/cloud/users", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "created", message: `Utilisateur créé: ${d.userid}` };
  }
};
