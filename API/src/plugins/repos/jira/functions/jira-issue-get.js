const { utils } = require("./utils");

module.exports = {
  async jira_issue_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const issueKey = (d.issueKey || "").trim();
    if (!issueKey) return { ok: false, error: "Missing issueKey." };

    log('Récupération des données...');
    const res = await utils.jiraRequest(opts, `/rest/api/3/issue/${encodeURIComponent(issueKey)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const f = r.fields || {};
    return {
      ok: true,
      id: r.id,
      key: r.key,
      summary: f.summary || "",
      description: f.description ? JSON.stringify(f.description) : "",
      status: f.status ? f.status.name : "",
      priority: f.priority ? f.priority.name : "",
      assignee: f.assignee ? f.assignee.displayName : "",
      reporter: f.reporter ? f.reporter.displayName : "",
      issueType: f.issuetype ? f.issuetype.name : "",
      projectKey: f.project ? f.project.key : "",
      created: f.created || "",
      updated: f.updated || ""
    };
  }
};
