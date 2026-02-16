const { utils } = require("./utils");

module.exports = {
  async jira_user_get_myself(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des données...');
    const res = await utils.jiraRequest(opts, "/rest/api/3/myself");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      accountId: r.accountId || "",
      displayName: r.displayName || "",
      emailAddress: r.emailAddress || "",
      active: r.active !== undefined ? String(r.active) : ""
    };
  }
};
