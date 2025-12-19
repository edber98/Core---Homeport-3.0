const { utils } = require("./utils");

module.exports = {
  async search_many_openproject_users(node, msg, inputs, opts) {
    const res = await utils.openprojectRequest(opts, "/users", {
      query: { pageSize: 1000, offset: 0 }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const elements = (res.data && res.data._embedded && res.data._embedded.elements) || [];
    const users = elements.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      login: user.login
    }));

    return { ok: true, users };
  }
};
