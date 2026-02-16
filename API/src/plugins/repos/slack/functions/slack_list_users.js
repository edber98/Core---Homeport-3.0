const { utils } = require("./utils");

module.exports = {
  async slack_list_users(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
  if (d.limit !== undefined && d.limit !== "" && d.limit !== null) body.limit = d.limit;

    log('Récupération de la liste...');
    const res = await utils.slackRequest(opts, "users.list", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const list = res.data.members || [];
    return {
      ok: true,
      users: list.map(u => ({
        id: u.id || "",
        name: u.name || "",
        real_name: u.real_name || (u.profile && u.profile.real_name) || "",
        email: (u.profile && u.profile.email) || "",
        is_admin: !!u.is_admin,
        is_bot: !!u.is_bot
      }))
    , totalCount: list.length };
  }
};
