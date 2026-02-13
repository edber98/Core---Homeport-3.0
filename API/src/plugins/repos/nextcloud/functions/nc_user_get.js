const { utils } = require("./utils");

module.exports = {
  async nc_user_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.userId) return { ok: false, error: "Identifiant requis." };
    log('Récupération des données...');
    const res = await utils.ocsRequest(opts, `/ocs/v1.php/cloud/users/${encodeURIComponent(d.userId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const u = (res.data && res.data.ocs && res.data.ocs.data) || {};
    return {
      ok: true,
      id: u.id || d.userId,
      displayName: u.displayname || u.displayName || "",
      email: u.email || "",
      phone: u.phone || "",
      quota: u.quota ? JSON.stringify(u.quota) : ""
    };
  }
};
