const { utils } = require("./utils");

module.exports = {
  async linear_users_list(node, msg, inputs, opts) {
    const query = `query { users { nodes { id name email active } } }`;

    const res = await utils.linearQuery(opts, query, {});
    if (!res.ok) return { ok: false, error: res.error };

    const nodes = (res.data && res.data.users && res.data.users.nodes) || [];
    const users = nodes.map(u => ({
      id: u.id || "", name: u.name || "", email: u.email || "",
      active: String(u.active !== undefined ? u.active : true)
    }));
    return { ok: true, users, totalCount: String(users.length) };
  }
};
