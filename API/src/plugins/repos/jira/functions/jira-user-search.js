const { utils } = require("./utils");

module.exports = {
  async jira_user_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = (d.query || "").trim();
    if (!query) return { ok: false, error: "Missing query." };

    log('Recherche en cours...');
    const res = await utils.jiraRequest(opts, "/rest/api/3/user/search", {
      query: { query }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = res.data || [];
    const user = results[0] || {};
    return {
      ok: true,
      accountId: user.accountId || "",
      displayName: user.displayName || "",
      emailAddress: user.emailAddress || "",
      active: user.active !== undefined ? String(user.active) : ""
    , totalCount: accountId.length };
  }
};
