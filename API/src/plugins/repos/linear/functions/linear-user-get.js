const { utils } = require("./utils");

module.exports = {
  async linear_user_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = (d.userId || "").trim();

    let query, variables;
    if (userId) {
      query = `query User($id: String!) { user(id: $id) { id name email displayName active } }`;
      variables = { id: userId };
    } else {
      query = `query { viewer { id name email displayName active } }`;
      variables = {};
    }

    const res = await utils.linearQuery(opts, query, variables);
    if (!res.ok) return { ok: false, error: res.error };

    const u = userId ? (res.data && res.data.user) || {} : (res.data && res.data.viewer) || {};
    return {
      ok: true, id: u.id || "", name: u.name || "", email: u.email || "",
      displayName: u.displayName || "", active: String(u.active !== undefined ? u.active : true)
    };
  }
};
