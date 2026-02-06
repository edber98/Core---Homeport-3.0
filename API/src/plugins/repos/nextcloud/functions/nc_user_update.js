const { utils } = require("./utils");

module.exports = {
  async nc_user_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.userId) return { ok: false, error: "Identifiant requis." };
    if (!d.key) return { ok: false, error: "Clé requise." };
    if (!d.value && d.value !== "") return { ok: false, error: "Valeur requise." };
    const res = await utils.ocsRequest(opts, `/ocs/v1.php/cloud/users/${encodeURIComponent(d.userId)}`, {
      method: "PUT",
      body: { key: d.key, value: d.value }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "updated", message: `Utilisateur ${d.userId} mis à jour (${d.key}).` };
  }
};
