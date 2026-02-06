const { utils } = require("./utils");

module.exports = {
  async jira_issue_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectKey = (d.projectKey || "").trim();
    const summary = (d.summary || "").trim();
    const issueType = (d.issueType || "").trim();
    if (!projectKey) return { ok: false, error: "Missing projectKey." };
    if (!summary) return { ok: false, error: "Missing summary." };
    if (!issueType) return { ok: false, error: "Missing issueType." };

    const fields = {
      project: { key: projectKey },
      summary,
      issuetype: { name: issueType }
    };
    if (d.description) fields.description = { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: d.description }] }] };
    if (d.priority) fields.priority = { name: d.priority };
    if (d.assigneeAccountId) fields.assignee = { accountId: d.assigneeAccountId };

    const res = await utils.jiraRequest(opts, "/rest/api/3/issue", {
      method: "POST",
      body: { fields }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, key: r.key, summary, issueType, projectKey, status: "Open", priority: d.priority || "", assignee: d.assigneeAccountId || "", reporter: "", description: d.description || "", created: new Date().toISOString(), updated: new Date().toISOString() };
  }
};
