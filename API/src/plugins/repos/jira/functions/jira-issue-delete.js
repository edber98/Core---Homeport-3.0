const { utils } = require("./utils");

module.exports = {
  async jira_issue_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const issueKey = (d.issueKey || "").trim();
    if (!issueKey) return { ok: false, error: "Missing issueKey." };

    log('Suppression en cours...');
    const res = await utils.jiraRequest(opts, `/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Issue ${issueKey} supprimée.` };
  }
};
