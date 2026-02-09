const { utils } = require("./utils");

module.exports = {
  async jira_worklog_add(node, msg, inputs, opts) {
    const d = inputs || {};
    const issueKey = (d.issueKey || "").trim();
    const timeSpent = (d.timeSpent || "").trim();
    if (!issueKey) return { ok: false, error: "Missing issueKey." };
    if (!timeSpent) return { ok: false, error: "Missing timeSpent." };

    const body = { timeSpent };
    if (d.comment) body.comment = { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: d.comment }] }] };

    const res = await utils.jiraRequest(opts, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog`, {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "added", message: `Worklog ${timeSpent} ajouté à ${issueKey}.` };
  }
};
