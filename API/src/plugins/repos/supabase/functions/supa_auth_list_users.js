const { utils } = require("./utils");

module.exports = {
  async supa_auth_list_users(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const page = d.page || 1;
    const perPage = d.perPage || 50;

    const res = await utils.supaAuth(opts, `/admin/users?page=${page}&per_page=${perPage}`);
    if (!res.ok) return res;
    const list = res.data.users || (Array.isArray(res.data) ? res.data : []);
    const users = list.map(u => ({
      id: u.id || "", email: u.email || "", role: u.role || "", createdAt: u.created_at || ""
    }));
    return { ok: true, users , totalCount: users.length };
  }
};
