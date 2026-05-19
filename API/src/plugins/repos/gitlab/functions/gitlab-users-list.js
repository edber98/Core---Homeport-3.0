const { utils } = require("./utils");

module.exports = {
  async gitlab_users_list(node, msg, inputs, opts) {
    const res = await utils.gitlabApi('GET', '/users', inputs, opts?.credentials, {
      queryParams: ["search", "per_page"]
    });
    if (!res.ok) return res;
    const rawItems = Array.isArray(res.data) ? res.data : [];
    const users = rawItems.map(r => ({
      id: r.id, username: r.username, name: r.name, state: r.state,
      avatar_url: r.avatar_url, web_url: r.web_url
    }));
    return { ok: true, users, totalCount: res.pagination?.total || users.length };
  }
};
