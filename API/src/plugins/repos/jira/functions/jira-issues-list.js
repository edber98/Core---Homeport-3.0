const { utils } = require("./utils");

module.exports = {
  async jira_issues_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const projectKey = (d.projectKey || "").trim();
    if (!projectKey) return { ok: false, error: "Missing projectKey." };

    const maxResults = parseInt(d.maxResults, 10) || 50;
    const jql = `project = ${projectKey} ORDER BY created DESC`;

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
    const totalCount = res.data?.total || 0;
    return { ok: true, totalCount, issues };
  }
};
