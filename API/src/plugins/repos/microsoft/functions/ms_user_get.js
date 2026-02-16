const { utils } = require("./utils");

module.exports = {
  async ms_user_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.userId) return { ok: false, error: "Missing userId." };

    log('Récupération des données...');
    const res = await utils.graphRequest(opts, `/users/${d.userId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const u = res.data;
    return {
      ok: true,
      id: u.id,
      displayName: u.displayName || "",
      mail: u.mail || "",
      userPrincipalName: u.userPrincipalName || "",
      jobTitle: u.jobTitle || ""
    };
  }
};
