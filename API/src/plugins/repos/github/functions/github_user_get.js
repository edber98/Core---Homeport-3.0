const { utils } = require("./utils");

module.exports = {
  async github_user_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const username = (d.username || "").trim();
    const path = username ? `/users/${username}` : "/user";
    log('Récupération des données...');
    const res = await utils.githubRequest(opts, path);
    if (!res.ok) return res;
    const r = res.data;
    return { ok: true, id: r.id, login: r.login, name: r.name, email: r.email, bio: r.bio, avatar_url: r.avatar_url, html_url: r.html_url, public_repos: r.public_repos, followers: r.followers, following: r.following, created_at: r.created_at };
  }
};
