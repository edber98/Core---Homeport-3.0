const { utils } = require("./utils");

module.exports = {
  async slack_lookup_by_email(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.email !== undefined && d.email !== "" && d.email !== null) body.email = d.email;

    log('Récupération des données...');
    const res = await utils.slackRequest(opts, "users.lookupByEmail", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const u = res.data.user || res.data;
    return {
      ok: true,
      id: u.id || "",
      name: u.name || "",
      real_name: u.real_name || (u.profile && u.profile.real_name) || "",
      email: (u.profile && u.profile.email) || "",
      is_admin: !!u.is_admin,
      is_bot: !!u.is_bot
    };
  }
};
