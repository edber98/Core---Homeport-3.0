const { utils } = require("./utils");

module.exports = {
  async jira_issue_search_jql(node, msg, inputs, opts) {
    const d = inputs || {};
    const jql = (d.jql || "").trim();
    if (!jql) return { ok: false, error: "Missing jql." };

    const maxResults = parseInt(d.maxResults, 10) || 50;

    const res = await utils.jiraRequest(opts, "/rest/api/3/search", {
      query: { jql, maxResults }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.issues) || [];
    const issues = results.map(r => {
      const f = r.fields || {};
      return {
        id: r.id,
        key: r.key,
        summary: f.summary || "",
        status: f.status ? f.status.name : "",
        priority: f.priority ? f.priority.name : "",
        assignee: f.assignee ? f.assignee.displayName : "",
        issueType: f.issuetype ? f.issuetype.name : "",
        projectKey: f.project ? f.project.key : "",
        created: f.created || ""
      };
    });
    return { ok: true, issues };
  }
};
