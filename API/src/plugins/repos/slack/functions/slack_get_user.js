const { utils } = require("./utils");

module.exports = {
  async slack_get_user(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.user !== undefined && d.user !== "" && d.user !== null) body.user = d.user;

    log('Récupération des données...');
    const res = await utils.slackRequest(opts, "users.info", body);
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
