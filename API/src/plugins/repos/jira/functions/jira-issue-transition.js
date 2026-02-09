const { utils } = require("./utils");

module.exports = {
  async jira_issue_transition(node, msg, inputs, opts) {
    const d = inputs || {};
    const issueKey = (d.issueKey || "").trim();
    const transitionId = (d.transitionId || "").toString().trim();
    if (!issueKey) return { ok: false, error: "Missing issueKey." };
    if (!transitionId) return { ok: false, error: "Missing transitionId." };

    const res = await utils.jiraRequest(opts, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
      method: "POST",
      body: { transition: { id: transitionId } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "transitioned", message: `Issue ${issueKey} transitioned (transition ${transitionId}).` };
  }
};
