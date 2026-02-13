const { utils } = require("./utils");

module.exports = {
  async calendly_organization_members_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const me = await utils.calendlyRequest(opts, "/users/me");
    if (!me.ok) return { ok: false, error: me.error, status: me.status, details: me.details };
    const orgUri = me.data?.resource?.current_organization;
    if (!orgUri) return { ok: false, error: "Cannot resolve organization URI." };

    const query = { organization: orgUri };
    if (d.count) query.count = d.count;
    if (d.pageToken) query.page_token = d.pageToken;

    log('Récupération de la liste...');
    const res = await utils.calendlyRequest(opts, "/organization_memberships", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.collection) || [];
    return { ok: true, status: "success", message: JSON.stringify(items.map(m => ({ uri: m.uri, role: m.role, user: m.user }))) };
  }
};
