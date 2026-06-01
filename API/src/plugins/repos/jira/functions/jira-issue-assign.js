const { utils } = require("./utils");

module.exports = {
  async jira_issue_assign(node, msg, inputs, opts) {
    const d = inputs || {};
    const issueKey = (d.issueKey || "").trim();
    const assigneeAccountId = (d.assigneeAccountId || "").trim();
    if (!issueKey) return { ok: false, error: "Missing issueKey." };
    if (!assigneeAccountId) return { ok: false, error: "Missing assigneeAccountId." };

    const res = await utils.jiraRequest(opts, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`, {
      method: "PUT",
      body: { accountId: assigneeAccountId }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, issueKey, assigneeAccountId, status: "assigned" };
  }
};
